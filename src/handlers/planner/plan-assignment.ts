import { Context } from "../../types/context";
import { currentAssignees, planIssueAssignment } from "./plan-issue-assignment";
import { PlannerIssue, RepositoryRef } from "./types";

function issueUrl(repository: RepositoryRef, issue: PlannerIssue): string {
  return `https://github.com/${repository.owner}/${repository.name}/issues/${issue.number}`;
}

export async function planAssignment(context: Context): Promise<void> {
  const tasks = await context.tasks.getSortedAvailableTasks();

  if (tasks.length === 0) {
    context.runSummary?.addAction(context.logger.info("No eligible tasks found").logMessage.raw);
    return;
  }

  const seedUrl = issueUrl(tasks[0].repository, tasks[0].issue);
  const available = await context.candidates.getAllAvailableLogins(seedUrl);
  const remaining = new Set(available);

  context.runSummary?.addAction(context.logger.info(`Selected ${tasks.length} task(s), ${available.length} candidate(s) available`).logMessage.raw);

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

    const assigned = await planIssueAssignment(context, repository, issue, remaining);
    if (assigned) {
      remaining.delete(assigned);
    }
  }
}
