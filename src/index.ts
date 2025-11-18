import { createAdapters } from "./adapters";
import { planIssue } from "./handlers/plan-issue";
import { runDailyAssignment } from "./handlers/run-daily-assignment";
import { BaseContext, Context } from "./types";
import { isIssueOpenedEvent } from "./types/typeguards";

export async function runPlugin(baseContext: BaseContext) {
  const context = Object.assign(baseContext, {
    adapters: createAdapters(baseContext),
  }) as Context;

  if (isIssueOpenedEvent(context)) {
    await planIssue(context);
    return;
  }

  await runDailyAssignment(context);
}
