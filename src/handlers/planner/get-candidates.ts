import { operations } from "../../types/generated/matchmaking";
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
  const issueUrl = `https://github.com/${repository.owner}/${repository.name}/issues/${issue.number}`;
  const baseCandidates = await context.collaborators.getAvailableCollaborators(repository.owner, issueUrl);

  if (baseCandidates.length === 0) {
    return [];
  }

  const matchmakingEndpoint = context.env.MATCHMAKING_ENDPOINT;

  if (!matchmakingEndpoint) {
    return baseCandidates;
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

    const allowed = new Set(baseCandidates);
    const seen = new Set<string>();
    const ordered = ranked.filter((login) => {
      if (!allowed.has(login) || seen.has(login)) {
        return false;
      }
      seen.add(login);
      return true;
    });
    const remaining = baseCandidates.filter((login) => !seen.has(login));

    return [...ordered, ...remaining];
  } catch (err) {
    context.logger.error("Failed to query matchmaking endpoint", { err });
    return baseCandidates;
  }
}

export async function getCandidateLoginsFromPool(
  context: PlannerContext,
  repository: RepositoryRef,
  issue: PlannerIssue,
  allowedLogins: ReadonlySet<string>
): Promise<string[]> {
  const candidates = await getCandidateLogins(context, repository, issue);
  return candidates.filter((login) => allowedLogins.has(login));
}
