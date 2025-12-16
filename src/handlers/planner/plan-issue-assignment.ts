import { getRecommendedContributors } from "../../matchmaking/get-recommended-contributors";
import { assignIssueToUser } from "./assign-issue-to-user";
import { calculateWorkload } from "./calculate-workload";
import { estimateIssueHours } from "./estimate-issue-hours";
import { getAssignedIssues } from "./get-assigned-issues";
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

  const issueUrl = `https://github.com/${repository.owner}/${repository.name}/issues/${issue.number}`;

  let candidates: string[];
  if (allowedLogins) {
    candidates = [...allowedLogins];
  } else {
    const tasks = await context.tasks.getSortedAvailableTasks();
    const seed = tasks[0];
    const seedUrl = seed ? `https://github.com/${seed.repository.owner}/${seed.repository.name}/issues/${seed.issue.number}` : issueUrl;

    candidates = await context.candidates.getAllAvailableLogins(seedUrl);
  }

  if (candidates.length === 0) {
    context.runSummary?.addAction(context.logger.warn(`No candidates available for ${issueRef}`).logMessage.raw);
    return null;
  }

  let scoredCandidates = candidates;
  let recommendationByLogin: ReadonlyMap<string, number> = new Map();
  try {
    const recommendations = await getRecommendedContributors(context.env.MATCHMAKING_ENDPOINT, issueUrl);
    recommendationByLogin = new Map(recommendations.map((entry) => [entry.login, entry.maxSimilarity] as const));
    const threshold = context.config.recommendationThreshold ?? 0;
    const relevant = recommendations.filter((entry) => entry.maxSimilarity >= threshold).map((entry) => entry.login);
    const filtered = relevant.filter((login) => candidates.includes(login));
    if (filtered.length > 0) {
      scoredCandidates = filtered;
    }
  } catch (err) {
    context.logger.warn("Failed to fetch matchmaking recommendations; falling back to workload-only assignment", { err: String(err) });
  }

  const scores: CandidateScore[] = [];

  for (const login of scoredCandidates) {
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

  const matchSimilarity = recommendationByLogin.get(chosen.login);
  return (await assignIssueToUser(context, repository, issue, chosen.login, matchSimilarity)) ? chosen.login : null;
}
