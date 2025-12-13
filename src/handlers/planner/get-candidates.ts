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

async function collectCandidates(context: PlannerContext, repository: RepositoryRef) {
  const orgs = Array.from(new Set([repository.owner, ...context.config.organizations]));
  const collected: string[] = [];

  for (const org of orgs) {
    const candidates = await context.adapters.getOrganizationCollaborators(org);

    for (const login of candidates) {
      if (!collected.includes(login)) {
        collected.push(login);
      }
    }
  }
  return collected;
}

export async function getCandidateLogins(context: PlannerContext, repository: RepositoryRef, issue: PlannerIssue): Promise<string[]> {
  const baseCandidates = await collectCandidates(context, repository);

  if (baseCandidates.length === 0) {
    return [];
  }

  const endpoint = context.env.MATCHMAKING_ENDPOINT;

  if (!endpoint) {
    return baseCandidates;
  }

  try {
    const queryParams: operations["getRecommendations"]["parameters"]["query"] = {
      issueUrls: [`https://github.com/${repository.owner}/${repository.name}/issues/${issue.number}`],
    };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        params.append(key, item);
      }
    }
    const response = await fetch(`${endpoint}/recommendations?${params.toString()}`, {
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
    const ordered = ranked.filter((login) => allowed.has(login));
    const remaining = baseCandidates.filter((login) => !ordered.includes(login));

    return [...ordered, ...remaining];
  } catch (err) {
    context.logger.error("Failed to query matchmaking endpoint", { err });
    return baseCandidates;
  }
}
