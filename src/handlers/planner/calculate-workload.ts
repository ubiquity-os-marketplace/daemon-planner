import { PlannerIssue } from "./types";

export function calculateWorkload(issues: PlannerIssue[]): number {
  return issues.length;
}
