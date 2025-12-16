import { getUserId } from "../github/get-user-id";
import type { Context } from "../types/context";
import type { operations as StartStopOperations } from "../types/generated/start-stop";

type StartStopContext = Pick<Context, "env" | "octokit" | "logger">;

export async function getStartStatus(context: StartStopContext, username: string, issueUrl: string) {
  const userId = await getUserId(context.octokit, username);
  if (!userId) {
    throw new Error("Could not resolve GitHub user id");
  }

  const tokenInfo = (await context.octokit.auth({ type: "installation" })) as { token: string };

  const queryParams: StartStopOperations["getStart"]["parameters"]["query"] = {
    userId,
    issueUrl,
  };

  const startStopUrl = `${context.env.START_STOP_ENDPOINT}/start?${new URLSearchParams(queryParams).toString()}`;

  context.logger.debug("Querying the start/stop URL", {
    startStopUrl,
  });

  const response = await fetch(startStopUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenInfo.token}`,
    },
  });

  if (!response.ok) {
    context.logger.warn(`Failed to get start status from endpoint`, { status: response.status, statusText: response.statusText, startStopUrl });
    return null;
  }

  const payload = (await response.json()) as StartStopOperations["getStart"]["responses"]["200"]["content"]["application/json"];

  context.logger.debug("Start/stop response", {
    startStopUrl,
    payload,
  });

  if (!payload.computed || !Array.isArray(payload.computed.assignedIssues)) {
    throw new Error("Start/stop endpoint returned an invalid payload");
  }

  return payload;
}
