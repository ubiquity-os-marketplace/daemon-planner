import { listAssignedIssues } from "../../github/list-assigned-issues";
import { PlannerContext, PlannerIssue } from "./types";

export async function getAssignedIssues(context: PlannerContext, login: string): Promise<PlannerIssue[]> {
  return listAssignedIssues(context.octokit, context.logger, context.config.organizations, login);
}
