import { getStartStatus } from "../../start-stop/get-start-status";
import { PlannerContext, PlannerIssue } from "./types";

function parseIssueUrl(url: string): { owner: string; repo: string; issue_number: number } | null {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)$/.exec(url);
  if (!match) {
    return null;
  }

  return { owner: match[1], repo: match[2], issue_number: Number(match[3]) };
}

export async function getAssignedIssues(context: PlannerContext, login: string, issueUrl: string): Promise<PlannerIssue[]> {
  const payload = await getStartStatus(context, login, issueUrl);

  if (!payload) {
    return [];
  }

  const refs = payload.computed.assignedIssues;

  const issues = await Promise.all(
    refs.map(async (ref) => {
      const parsed = parseIssueUrl(ref.html_url);
      if (!parsed) {
        return null;
      }

      const response = await context.octokit.rest.issues.get(parsed);
      return response.data as unknown as PlannerIssue;
    })
  );

  return issues.filter((issue): issue is PlannerIssue => Boolean(issue));
}
