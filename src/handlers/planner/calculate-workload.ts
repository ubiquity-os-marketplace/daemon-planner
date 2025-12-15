import { PluginSettings } from "../../types/plugin-input";
import { estimateIssueHours } from "./estimate-issue-hours";
import { PlannerIssue } from "./types";

export function calculateWorkload(issues: PlannerIssue[], config: PluginSettings): number {
  return issues.reduce((total, current) => {
    const issueHours = estimateIssueHours(current, config);
    if (issueHours === null) {
      return 0;
    }
    const estimate = issueHours + config.reviewBufferHours;
    return total + estimate;
  }, 0);
}
