import { Context } from "../types/context";
import { planIssueAssignment } from "./planner/plan-issue-assignment";

export async function planIssue(context: Context<"issues.opened" | "issues.reopened" | "issues.closed">) {
  const repository = {
    owner: context.payload.repository.owner.login,
    name: context.payload.repository.name,
  };

  await planIssueAssignment(context, repository, context.payload.issue);
}
