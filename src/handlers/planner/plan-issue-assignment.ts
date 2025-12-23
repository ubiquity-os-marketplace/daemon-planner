import { getRecommendedContributors } from "../../matchmaking/get-recommended-contributors";
import { assignIssueToUser } from "./assign-issue-to-user";
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

function normalizeSimilarity(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  return value > 1 ? value / 100 : value;
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
    context.logger.warn(`No candidates available for ${issueUrl}`, { issueUrl });
    return null;
  }

  let scoredCandidates: typeof candidates = candidates;
  let recommendationByLogin: ReadonlyMap<string, number> = new Map();
  try {
    const recommendations = await getRecommendedContributors(context, issueUrl, candidates);
    recommendationByLogin = new Map(recommendations.map((entry) => [entry.login, normalizeSimilarity(entry.maxSimilarity)] as const));
    context.logger.debug("Using the current recommendation list for logins", {
      recommendationByLogin,
      issueUrl,
      candidates,
    });

    const threshold = normalizeSimilarity(context.config.recommendationThreshold);
    const filtered = recommendations
      .map((entry) => ({ login: entry.login, similarity: normalizeSimilarity(entry.maxSimilarity) }))
      .filter((entry) => entry.similarity >= threshold)
      .map((entry) => entry.login)
      .filter((login) => candidates.includes(login));

    if (filtered.length > 0) {
      scoredCandidates = filtered;
    }
  } catch (err) {
    context.logger.warn("Failed to fetch matchmaking recommendations; falling back to workload-only assignment", { err });
  }

  const statuses = await context.candidates.getAllCandidateStatuses(issueUrl);
  const assignedCountByLogin = new Map(statuses.map((entry) => [entry.login, entry.assignedIssueUrls.length] as const));

  const scores: CandidateScore[] = scoredCandidates.map((login) => ({
    login,
    load: assignedCountByLogin.get(login) ?? Number.POSITIVE_INFINITY,
  }));

  const chosen = sortByWorkload(scores)[0];

  if (!chosen) {
    context.runSummary?.addAction(context.logger.warn(`Could not assign ${issueRef} to any user`).logMessage.raw);
    return null;
  }

  const matchSimilarity = recommendationByLogin.get(chosen.login);
  return (await assignIssueToUser(context, repository, issue, chosen.login, matchSimilarity)) ? chosen.login : null;
}
