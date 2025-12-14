import { operations } from "../types/generated/start-stop";
import { Context } from "../types/index";
import { getUserId } from "../github/get-user-id";
import { estimateIssueHours } from "./planner/estimate-issue-hours";

export async function runDailyAssignment(context: Context) {
  const tasks = await context.tasks.getSortedAvailableTasks();

  if (tasks.length === 0) {
    return;
  }

  const probeIssueUrl = `https://github.com/${tasks[0].repository.owner}/${tasks[0].repository.name}/issues/${tasks[0].issue.number}`;
  const users = await context.collaborators.getAllAvailableLogins(probeIssueUrl);

  if (tasks.length === 0 || users.length === 0) {
    return;
  }

  const capacity = context.config.dailyCapacityHours * context.config.planningHorizonDays;
  const tokenInfo = (await context.octokit.auth({ type: "installation" })) as { token: string };
  const unassignedUsers: string[] = [];

  for (const login of users) {
    if (tasks.length === 0) {
      unassignedUsers.push(login);
      continue;
    }

    let isAssigned = false;

    for (let index = 0; index < tasks.length; index += 1) {
      const task = tasks[index];

      const isEligible = await context.collaborators.isMemberOfOrg(login, task.repository.owner);
      if (!isEligible) {
        continue;
      }

      const issueHours = estimateIssueHours(task.issue, context.config);
      if (issueHours === null) {
        continue;
      }

      const estimate = issueHours + context.config.reviewBufferHours;
      if (estimate > capacity) {
        continue;
      }

      const issueUrl = `https://github.com/${task.repository.owner}/${task.repository.name}/issues/${task.issue.number}`;
      const body: NonNullable<operations["postStart"]["requestBody"]>["content"]["application/json"] = {
        issueUrl,
        userId: await getUserId(context.octokit, login),
      };

      try {
        const response = await fetch(`${context.env.START_STOP_ENDPOINT}/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenInfo.token}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          context.logger.warn(`Failed to assign ${issueUrl} to ${login}`, { status: response.status, statusText: response.statusText });
          continue;
        }

        context.logger.ok(`Assigned ${issueUrl} to ${login}`);
        tasks.splice(index, 1);
        isAssigned = true;
        break;
      } catch (err) {
        context.logger.error(`Failed to assign ${issueUrl} to ${login}`, { err: String(err) });
      }
    }

    if (!isAssigned) {
      unassignedUsers.push(login);
    }
  }

  if (unassignedUsers.length > 0) {
    context.logger.warn("Some users could not be assigned to any task", { users: unassignedUsers });
  }
}
