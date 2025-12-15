import { operations } from "../../types/generated/start-stop";
import { getUserId } from "../../github/get-user-id";
import { calculateWorkload } from "./calculate-workload";
import { estimateIssueHours } from "./estimate-issue-hours";
import { getAssignedIssues } from "./get-assigned-issues";
import { getCandidateLogins } from "./get-candidates";
import { CandidateScore, PlannerContext, PlannerIssue, RepositoryRef } from "./types";

function currentAssignees(issue: PlannerIssue): string[] {
  const assignees = issue.assignees ?? [];
  const result = assignees.map((entry) => entry?.login).filter((login): login is string => Boolean(login));

  const single = issue.assignee?.login;

  if (single) {
    result.push(single);
  }

  return Array.from(new Set(result));
}

function sortByWorkload(collection: CandidateScore[]): CandidateScore[] {
  return [...collection].sort((a, b) => a.load - b.load);
}

export async function planAssignment(context: PlannerContext, repository: RepositoryRef, issue: PlannerIssue): Promise<void> {
  if (!issue?.number) {
    context.runSummary?.addAction(context.logger.error("Issue number missing from the payload").logMessage.raw);
    return;
  }

  const issueRef = `${repository.owner}/${repository.name}#${issue.number}`;

  const existingAssignees = currentAssignees(issue);

  if (existingAssignees.length > 0) {
    context.runSummary?.addAction(
      context.logger.debug(`Skipped ${issueRef} (already assigned: ${existingAssignees.join(", ")})`, { existingAssignees, repository }).logMessage.raw
    );
    return;
  }

  const candidates = await getCandidateLogins(context, repository, issue);

  if (candidates.length === 0) {
    context.runSummary?.addAction(context.logger.warn(`No candidates available for ${issueRef}`).logMessage.raw);
    return;
  }

  const scores: CandidateScore[] = [];

  const issueUrl = `https://github.com/${repository.owner}/${repository.name}/issues/${issue.number}`;

  for (const login of candidates) {
    const issues = await getAssignedIssues(context, login, issueUrl);
    const load = calculateWorkload(issues, context.config);
    scores.push({ login, load });
  }

  if (scores.length === 0) {
    context.runSummary?.addAction(context.logger.warn(`Failed to calculate workloads for ${issueRef}`).logMessage.raw);
    return;
  }

  const issueHours = estimateIssueHours(issue, context.config);
  if (issueHours === null) {
    context.runSummary?.addAction(context.logger.warn(`Failed to estimate hours for ${issueRef}`).logMessage.raw);
    return;
  }
  const estimate = issueHours + context.config.reviewBufferHours;
  const capacity = context.config.dailyCapacityHours * context.config.planningHorizonDays;

  const available = sortByWorkload(scores.filter((entry) => entry.load + estimate <= capacity));
  const fallback = sortByWorkload(scores);
  const chosen = (available.length > 0 ? available : fallback)[0];

  if (!chosen) {
    context.runSummary?.addAction(context.logger.warn(`Could not assign ${issueRef} to any user`).logMessage.raw);
    return;
  }

  if (context.config.dryRun) {
    context.runSummary?.addAction(
      context.logger.info(`Dry run: would assign ${issueRef} to ${chosen.login}`, { repository, issue: issue.number, chosen: chosen.login }).logMessage.raw
    );
    return;
  }

  const body: NonNullable<operations["postStart"]["requestBody"]>["content"]["application/json"] = {
    issueUrl,
    userId: await getUserId(context.octokit, chosen.login),
  };
  try {
    const tokenInfo = (await context.octokit.auth({ type: "installation" })) as { token: string };
    const response = await fetch(`${context.env.START_STOP_ENDPOINT}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenInfo.token}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      context.runSummary?.addAction(
        context.logger.warn(`Failed to assign ${issueRef} to ${chosen.login} (${response.status} ${response.statusText})`, {
          response: response.status,
          status: response.statusText,
          url: `https://github.com/${repository.owner}/${repository.name}/issues/${issue.number}`,
        }).logMessage.raw
      );
    } else {
      context.runSummary?.addAction(
        context.logger.ok(`Assigned ${issueRef} to ${chosen.login}`, {
          response: await response.json(),
        }).logMessage.raw
      );
    }
  } catch (err) {
    context.runSummary?.addAction(
      context.logger.error(`Failed to assign ${issueRef} to ${chosen.login}`, {
        err: String(err),
        url: `https://github.com/${repository.owner}/${repository.name}/issues/${issue.number}`,
      }).logMessage.raw
    );
  }
}
