import { Context } from "../types/index";
import { planAssignment } from "./planner/plan-assignment";

export async function planIssue(context: Context<"issues.opened" | "issues.reopened">) {
  const repository = {
    owner: context.payload.repository.owner.login,
    name: context.payload.repository.name,
  };

  await planAssignment(context, repository, context.payload.issue);
}
