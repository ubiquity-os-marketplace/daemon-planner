import { createAdapters } from "./adapters/create-adapters";
import { CandidatePool } from "./candidates/candidate-pool";
import { OrgOctokitPool } from "./github/org-octokit-pool";
import { planAssignment } from "./handlers/planner/plan-assignment";
import { TaskPriorityPool } from "./tasks/task-priority-pool";
import { BaseContext, Context } from "./types/context";
import { isIssueClosedEvent, isIssueOpenedEvent, isIssueReopenedEvent } from "./types/typeguards";

export async function runPlugin(baseContext: BaseContext) {
  const octokits = new OrgOctokitPool(baseContext);
  const adapters = createAdapters({ ...baseContext, octokits } as Context);
  const candidates = new CandidatePool({ ...baseContext, adapters, octokits } as Context);
  const context = Object.assign(baseContext, {
    adapters,
    candidates,
    octokits,
    tasks: new TaskPriorityPool({ ...baseContext, octokits } as Context),
  }) as Context;

  if (isIssueOpenedEvent(context) || isIssueReopenedEvent(context) || isIssueClosedEvent(context)) {
    await planAssignment(context);
    return;
  }
  context.logger.info("Event not supported", { event: context.eventName });
}
