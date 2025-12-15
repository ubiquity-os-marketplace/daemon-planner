import { assignIssueToUser } from "./assign-issue-to-user";
import { calculateWorkload } from "./calculate-workload";
import { estimateIssueHours } from "./estimate-issue-hours";
import { getAssignedIssues } from "./get-assigned-issues";
import { getCandidateLogins, getCandidateLoginsFromPool } from "./get-candidates";
import { CandidateScore, PlannerContext, PlannerIssue, RepositoryRef } from "./types";

export function currentAssignees(issue: PlannerIssue): string[] {
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

export async function planIssueAssignment(
  context: PlannerContext,
  repository: RepositoryRef,
  issue: PlannerIssue,
  allowedLogins?: ReadonlySet<string>
): Promise<string | null> {
  if (!issue?.number) {
    context.runSummary?.addAction(context.logger.error("Issue number missing from the payload").logMessage.raw);
    return null;
  }

  const issueRef = `${repository.owner}/${repository.name}#${issue.number}`;

  const existingAssignees = currentAssignees(issue);

  if (existingAssignees.length > 0) {
    context.runSummary?.addAction(
      context.logger.debug(`Skipped ${issueRef} (already assigned: ${existingAssignees.join(", ")})`, { existingAssignees, repository }).logMessage.raw
    );
    return null;
  }

  const candidates = allowedLogins
    ? await getCandidateLoginsFromPool(context, repository, issue, allowedLogins)
    : await getCandidateLogins(context, repository, issue);

  if (candidates.length === 0) {
    context.runSummary?.addAction(context.logger.warn(`No candidates available for ${issueRef}`).logMessage.raw);
    return null;
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
    return null;
  }

  const issueHours = estimateIssueHours(issue, context.config);
  if (issueHours === null) {
    context.runSummary?.addAction(context.logger.warn(`Failed to estimate hours for ${issueRef}`).logMessage.raw);
    return null;
  }
  const estimate = issueHours + context.config.reviewBufferHours;
  const capacity = context.config.dailyCapacityHours * context.config.planningHorizonDays;

  const available = sortByWorkload(scores.filter((entry) => entry.load + estimate <= capacity));
  const fallback = sortByWorkload(scores);
  const chosen = (available.length > 0 ? available : fallback)[0];

  if (!chosen) {
    context.runSummary?.addAction(context.logger.warn(`Could not assign ${issueRef} to any user`).logMessage.raw);
    return null;
  }

  return (await assignIssueToUser(context, repository, issue, chosen.login)) ? chosen.login : null;
}
