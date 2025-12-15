import { createAdapters } from "./adapters/create-adapters";
import { CollaboratorPool } from "./collaborators/collaborator-pool";
import { planIssue } from "./handlers/plan-issue";
import { TaskPriorityPool } from "./tasks/task-priority-pool";
import { BaseContext, Context } from "./types/context";
import { isIssueClosedEvent, isIssueOpenedEvent, isIssueReopenedEvent } from "./types/typeguards";

export async function runPlugin(baseContext: BaseContext) {
  const adapters = createAdapters(baseContext);
  const collaborators = new CollaboratorPool({ ...baseContext, adapters });
  const context = Object.assign(baseContext, {
    adapters,
    collaborators,
    tasks: new TaskPriorityPool(baseContext),
  }) as Context;

  if (isIssueOpenedEvent(context) || isIssueReopenedEvent(context) || isIssueClosedEvent(context)) {
    await planIssue(context);
    return;
  }
  context.logger.info("Event not supported", { event: context.eventName });
}
