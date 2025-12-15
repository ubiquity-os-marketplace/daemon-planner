import { Context } from "../../types/context";
import { planIssueAssignment } from "./plan-issue-assignment";
import { PlannerIssue, RepositoryRef } from "./types";

function issueUrl(repository: RepositoryRef, issue: PlannerIssue): string {
  return `https://github.com/${repository.owner}/${repository.name}/issues/${issue.number}`;
}

function currentAssignees(issue: PlannerIssue): string[] {
  const assignees = issue.assignees ?? [];
  const result = assignees.map((entry) => entry?.login).filter((login): login is string => Boolean(login));

  const single = issue.assignee?.login;

  if (single) {
    result.push(single);
  }

  return Array.from(new Set(result));
}

export async function planAssignment(context: Context): Promise<void> {
  const tasks = await context.tasks.getSortedAvailableTasks();
  const limit = context.config.assignedTaskLimit;
  const selected = tasks.slice(0, limit);

  if (selected.length === 0) {
    context.runSummary?.addAction(context.logger.info("No eligible tasks found").logMessage.raw);
    return;
  }

  const seedUrl = issueUrl(selected[0].repository, selected[0].issue);
  const available = await context.collaborators.getAllAvailableLogins(seedUrl);
  const remaining = new Set(available);

  context.runSummary?.addAction(context.logger.info(`Selected ${selected.length} task(s), ${available.length} collaborator(s) available`).logMessage.raw);

  for (const task of selected) {
    if (remaining.size === 0) {
      context.runSummary?.addAction(context.logger.info("Stopping early (no collaborators left to assign)").logMessage.raw);
      return;
    }

    const repository = task.repository;
    const issue = task.issue;

    if (!issue?.number) {
      continue;
    }

    const existing = currentAssignees(issue);
    if (existing.length > 0) {
      continue;
    }

    const assigned = await planIssueAssignment(context, repository, issue, remaining);
    if (assigned) {
      remaining.delete(assigned);
    }
  }
}
