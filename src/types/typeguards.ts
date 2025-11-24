import { Context } from "./context";

export function isIssueOpenedEvent(context: Context): context is Context<"issues.opened"> {
  return context.eventName === "issues.opened";
}

export function isIssueReopenedEvent(context: Context): context is Context<"issues.reopened"> {
  return context.eventName === "issues.reopened";
}
