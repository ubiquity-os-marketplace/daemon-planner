import { calculateLoad } from "./calculate-load";
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
    context.logger.error("Issue payload missing number");
    return;
  }

  const existingAssignees = currentAssignees(issue);

  if (existingAssignees.length > 0) {
    context.logger.debug("Ignoring the issue because it already has users assigned", { existingAssignees, repository });
    return;
  }

  const candidates = await getCandidateLogins(context, repository, issue);

  if (candidates.length === 0) {
    context.logger.warn(`No candidates available for ${repository.owner}/${repository.name}#${issue.number}`);
    return;
  }

  const scores: CandidateScore[] = [];

  for (const login of candidates) {
    const issues = await getAssignedIssues(context, login);
    const load = calculateLoad(issues, context.config);
    scores.push({ login, load });
  }

  if (scores.length === 0) {
    context.logger.warn(`Could not calculate workloads for ${repository.owner}/${repository.name}#${issue.number}`);
    return;
  }

  const estimate = estimateIssueHours(issue, context.config) + context.config.reviewBufferHours;
  const capacity = context.config.dailyCapacityHours * context.config.planningHorizonDays;

  const available = sortByWorkload(scores.filter((entry) => entry.load + estimate <= capacity));
  const fallback = sortByWorkload(scores);
  const chosen = (available.length > 0 ? available : fallback)[0];

  if (!chosen) {
    return;
  }

  await fetch(context.env.START_STOP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repository,
      issue: { number: issue.number },
      command: "assign",
      assignee: chosen.login,
    }),
  });
  context.logger.ok(`Assigned ${repository.owner}/${repository.name}#${issue.number} to ${chosen.login}`);
}
