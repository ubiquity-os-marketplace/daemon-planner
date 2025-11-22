import { PluginSettings } from "../../types/index";
import { estimateIssueHours } from "./estimate-issue-hours";
import { PlannerIssue } from "./types";

export function calculateLoad(issues: PlannerIssue[], config: PluginSettings): number {
  return issues.reduce((total, current) => {
    const estimate = estimateIssueHours(current, config) + config.reviewBufferHours;
    return total + estimate;
  }, 0);
}
