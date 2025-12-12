import ms from "ms";
import { PluginSettings } from "../../types/index";
import { PlannerIssue, PlannerLabel } from "./types";

function labelName(label: PlannerLabel | string): string {
  if (typeof label === "string") {
    return label;
  }

  return label?.name ?? String();
}

function parseDurationHours(value: string, config: PluginSettings): number | null {
  const cleaned = value
    .replace(/[<>]/g, String())
    .replace(/about|approx\.?/gi, String())
    .trim();
  const duration = ms(cleaned.toLowerCase());

  if (typeof duration === "number" && duration > 0) {
    return duration / (60 * 60 * 1000);
  }

  const numericMatch = /(\d+(?:\.\d+)?)/.exec(cleaned);

  if (!numericMatch) {
    return null;
  }

  const amount = Number(numericMatch[1]);

  if (Number.isNaN(amount) || amount <= 0) {
    return null;
  }

  if (/weeks?/i.test(cleaned)) {
    return amount * config.dailyCapacityHours * 5;
  }

  if (/day?s/i.test(cleaned)) {
    return amount * config.dailyCapacityHours;
  }

  if (/hour?s/i.test(cleaned)) {
    return amount;
  }

  return null;
}

export function estimateIssueHours(issue: PlannerIssue, config: PluginSettings): number | null {
  const labels = (issue.labels?.filter((label) => !!label) as Array<string | PlannerLabel>) ?? [];
  const timeLabel = labels.map(labelName).find((value) => value.toLowerCase().startsWith("time:"));

  if (!timeLabel) {
    return null;
  }

  const descriptor = timeLabel.split(":").slice(1).join(":").trim();
  const parsed = parseDurationHours(descriptor, config);

  if (parsed === null) {
    return null;
  }

  return parsed;
}
