import { Context } from "../../types/context";
import { currentAssignees, planIssueAssignment } from "./plan-issue-assignment";
import { PlannerIssue, RepositoryRef } from "./types";

function issueUrl(repository: RepositoryRef, issue: PlannerIssue): string {
  return `https://github.com/${repository.owner}/${repository.name}/issues/${issue.number}`;
}

export async function planAssignment(context: Context): Promise<void> {
  const tasks = await context.tasks.getSortedAvailableTasks();

  context.runSummary?.setConsideredTasks(
    tasks.map((task) => ({
      owner: task.repository.owner,
      repo: task.repository.name,
      issueNumber: task.issue.number,
    }))
  );

  if (tasks.length === 0) {
    context.runSummary?.addAction(context.logger.info("No eligible tasks found").logMessage.raw);
    return;
  }

  const seedUrl = issueUrl(tasks[0].repository, tasks[0].issue);
  const statuses = await context.candidates.getAllCandidateStatuses(seedUrl);
  context.runSummary?.setCandidates(statuses);

  const available = statuses.filter((entry) => entry.isAvailable).map((entry) => entry.login);
  const remaining = new Set(available);

  context.runSummary?.addAction(
    context.logger.info(`Selected ${tasks.length} task(s), ${available.length}/${statuses.length} candidate(s) available`).logMessage.raw
  );

  for (const task of tasks) {
    if (remaining.size === 0) {
      context.runSummary?.addAction(context.logger.info("Stopping early (no candidates left to assign)").logMessage.raw);
      return;
    }

    const repository = task.repository;
    const issue = task.issue;

    if (!issue?.number) {
      context.logger.warn(`Skipping ${issueUrl(repository, issue)} : missing issue number`);
      continue;
    }

    const existing = currentAssignees(issue);
    if (existing.length > 0) {
      context.logger.warn(`Skipping ${issueUrl(repository, issue)} : already assigned to ${existing.join(", ")}`);
      continue;
    }

    const orgCandidates = await context.candidates.getAvailableCandidates(repository.owner, seedUrl);
    const allowed = orgCandidates.filter((login) => remaining.has(login));
    if (allowed.length === 0) {
      context.logger.warn(`No candidates available for ${repository.owner} tasks`);
      continue;
    }

    const assigned = await planIssueAssignment(context, repository, issue, new Set(allowed));
    if (assigned) {
      remaining.delete(assigned);
    }
  }
}
