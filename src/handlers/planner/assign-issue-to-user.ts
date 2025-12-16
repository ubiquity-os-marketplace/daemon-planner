import { getUserId } from "../../github/get-user-id";
import { operations } from "../../types/generated/start-stop";
import { PlannerContext, PlannerIssue, RepositoryRef } from "./types";

function formatMatchPercent(similarity?: number | null): string {
  if (similarity === null || similarity === undefined || !Number.isFinite(similarity)) {
    return "";
  }

  return ` (${Math.round(similarity * 100)}%)`;
}

export async function assignIssueToUser(
  context: PlannerContext,
  repository: RepositoryRef,
  issue: PlannerIssue,
  login: string,
  matchSimilarity?: number | null
): Promise<boolean> {
  if (!issue?.number) {
    return false;
  }

  const issueUrl = `https://github.com/${repository.owner}/${repository.name}/issues/${issue.number}`;
  const issueRef = `${repository.owner}/${repository.name}#${issue.number}`;
  const match = formatMatchPercent(matchSimilarity);

  if (context.config.dryRun) {
    context.runSummary?.addAction(
      context.logger.info(`Dry run: would assign ${issueRef} to ${login}${match}`, { repository, issue: issue.number, chosen: login, matchSimilarity })
        .logMessage.raw
    );
    return true;
  }

  const body: NonNullable<operations["postStart"]["requestBody"]>["content"]["application/json"] = {
    issueUrl,
    userId: await getUserId(context.octokit, login),
  };

  try {
    const tokenInfo = (await context.octokit.auth({ type: "installation" })) as { token: string };
    const response = await fetch(`${context.env.START_STOP_ENDPOINT}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenInfo.token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      context.runSummary?.addAction(
        context.logger.warn(`Failed to assign ${issueRef} to ${login} (${response.status} ${response.statusText})`, {
          response: response.status,
          status: response.statusText,
          url: issueUrl,
        }).logMessage.raw
      );
      return false;
    }

    context.runSummary?.addAction(
      context.logger.ok(`Assigned ${issueRef} to ${login}${match}`, {
        matchSimilarity,
        response: await response.json(),
      }).logMessage.raw
    );
    return true;
  } catch (err) {
    context.runSummary?.addAction(
      context.logger.error(`Failed to assign ${issueRef} to ${login}`, {
        err: String(err),
        url: issueUrl,
      }).logMessage.raw
    );
    return false;
  }
}
