import { PlannerContext, PlannerIssue, RepositoryRef } from "./types";

function normaliseCandidate(entry: unknown): string | null {
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
  const configuredCandidates = context.config.candidateLogins;
  const baseCandidates = configuredCandidates.length > 0 ? configuredCandidates : await context.adapters.getAllCandidates();

  if (baseCandidates.length === 0) {
    return [];
  }

  const endpoint = context.env.MATCHMAKING_ENDPOINT;

  if (!endpoint) {
    return baseCandidates;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repository,
        issue: {
          number: issue.number,
          labels: (issue.labels ?? []).map((entry) => {
            if (typeof entry === "string") {
              return entry;
            }

            return entry?.name ?? String();
          }),
        },
        candidates: baseCandidates,
      }),
    });

    if (!response.ok) {
      context.logger.error(`Matchmaking endpoint returned ${response.status}`, { response });
      return baseCandidates;
    }

    const payload = await response.json();
    const candidates = Array.isArray(payload?.candidates) ? payload.candidates : payload;

    const ranked = (Array.isArray(candidates) ? candidates : []).map(normaliseCandidate).filter((login): login is string => Boolean(login));

    const allowed = new Set(baseCandidates);
    const ordered = ranked.filter((login) => allowed.has(login));
    const remaining = baseCandidates.filter((login) => !ordered.includes(login));

    return [...ordered, ...remaining];
  } catch (err) {
    context.logger.error("Failed to query matchmaking endpoint", { err });
    return baseCandidates;
  }
}
