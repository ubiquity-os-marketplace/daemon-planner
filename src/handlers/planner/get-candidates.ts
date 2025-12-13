import { operations } from "../../types/generated/matchmaking";
import { operations as StartStopOperations } from "../../types/generated/start-stop";
import { PlannerContext, PlannerIssue, RepositoryRef } from "./types";

function normalizeCandidate(entry: unknown): string | null {
  if (typeof entry === "string") {
    return entry;
  }

  if (entry && typeof entry === "object") {
    const login = (entry as { login?: unknown }).login;

    if (typeof login === "string") {
      return login;
    }
  }

  return null;
}

export async function getCandidateLogins(context: PlannerContext, repository: RepositoryRef, issue: PlannerIssue): Promise<string[]> {
  const baseCandidates = await context.collaborators.getAvailableCollaborators(repository.owner);

  if (baseCandidates.length === 0) {
    return [];
  }

  const matchmakingEndpoint = context.env.MATCHMAKING_ENDPOINT;
  const startStopEndpoint = context.env.START_STOP_ENDPOINT;

  const issueUrl = `https://github.com/${repository.owner}/${repository.name}/issues/${issue.number}`;
  const tokenInfo = (await context.octokit.auth({ type: "installation" })) as { token: string };

  const startAllowed = await Promise.all(
    baseCandidates.map(async (userId) => {
      const queryParams: StartStopOperations["getStart"]["parameters"]["query"] = {
        userId,
        issueUrl,
      };

      const response = await fetch(`${startStopEndpoint}/start?${new URLSearchParams(queryParams).toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as StartStopOperations["getStart"]["responses"]["200"]["content"]["application/json"];

      return payload.ok ? userId : null;
    })
  );

  const allowedCandidates = startAllowed.filter((login): login is string => Boolean(login));

  if (allowedCandidates.length === 0) {
    return [];
  }

  if (!matchmakingEndpoint) {
    return allowedCandidates;
  }

  try {
    const queryParams: operations["getRecommendations"]["parameters"]["query"] = {
      issueUrls: [issueUrl],
    };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        params.append(key, item);
      }
    }
    const response = await fetch(`${matchmakingEndpoint}/recommendations?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      context.logger.error(`Matchmaking endpoint returned ${response.status}`, { response });
      return baseCandidates;
    }

    const payload: operations["getRecommendations"]["responses"]["200"]["content"]["application/json"] = await response.json();
    const candidates = Array.isArray(payload?.candidates) ? payload.candidates : payload;

    const ranked = (Array.isArray(candidates) ? candidates : []).map(normalizeCandidate).filter((login): login is string => Boolean(login));

    const allowed = new Set(allowedCandidates);
    const seen = new Set<string>();
    const ordered = ranked.filter((login) => {
      if (!allowed.has(login) || seen.has(login)) {
        return false;
      }
      seen.add(login);
      return true;
    });
    const remaining = allowedCandidates.filter((login) => !seen.has(login));

    return [...ordered, ...remaining];
  } catch (err) {
    context.logger.error("Failed to query matchmaking endpoint", { err });
    return allowedCandidates;
  }
}
