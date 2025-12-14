import { createAdapters } from "./adapters/index";
import { CollaboratorPool } from "./collaborators/collaborator-pool";
import { planIssue } from "./handlers/plan-issue";
import { runDailyAssignment } from "./handlers/run-daily-assignment";
import { TaskPriorityPool } from "./tasks/task-priority-pool";
import { BaseContext, Context } from "./types/index";
import { isIssueOpenedEvent, isIssueReopenedEvent } from "./types/typeguards";

export async function runPlugin(baseContext: BaseContext) {
  const adapters = createAdapters(baseContext);

  const collaborators = new CollaboratorPool({
    adapters,
    config: baseContext.config,
    env: baseContext.env,
    logger: baseContext.logger,
    octokit: baseContext.octokit,
  });

  const context = Object.assign(baseContext, {
    adapters,
    collaborators,
    tasks: new TaskPriorityPool(baseContext),
  }) as Context;

  if (isIssueOpenedEvent(context) || isIssueReopenedEvent(context)) {
    await planIssue(context);
    return;
  }

  await runDailyAssignment(context);
}
