import ms from "ms";
import { PluginSettings } from "../../types";
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

  if (/week/i.test(cleaned)) {
    return amount * config.dailyCapacityHours * 5;
  }

  if (/day/i.test(cleaned)) {
    return amount * config.dailyCapacityHours;
  }

  if (/hour/i.test(cleaned)) {
    return amount;
  }

  return null;
}

export function estimateIssueHours(issue: PlannerIssue, config: PluginSettings): number {
  const labels = issue.labels ?? [];
  const timeLabel = labels.map(labelName).find((value) => value.toLowerCase().startsWith("time:"));

  if (!timeLabel) {
    return config.defaultEstimateHours;
  }

  const descriptor = timeLabel.split(":").slice(1).join(":").trim();
  const parsed = parseDurationHours(descriptor, config);

  if (parsed === null) {
    return config.defaultEstimateHours;
  }

  return parsed;
}
