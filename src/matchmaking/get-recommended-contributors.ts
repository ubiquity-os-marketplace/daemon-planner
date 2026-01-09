import { Context } from "../types/context";
import type { operations } from "../types/generated/matchmaking";

type RecommendationsResponse = operations["getRecommendations"]["responses"][200]["content"]["application/json"];
type RecommendationBucket = NonNullable<RecommendationsResponse[string]>;
export type RecommendedContributor = RecommendationBucket["sortedContributors"][number];

export async function getRecommendedContributors(
  context: Pick<Context, "logger" | "env">,
  issueUrl: string,
  candidates: string[]
): Promise<RecommendedContributor[]> {
  const url = new URL("/recommendations", context.env.MATCHMAKING_ENDPOINT);
  url.searchParams.append("issueUrls", issueUrl);
  for (const candidate of candidates) {
    url.searchParams.append("users", candidate);
  }

  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) {
    throw new Error(`Matchmaking recommendations request failed ${url} (${response.status} ${response.statusText})`);
  }

  const payload = (await response.json()) as RecommendationsResponse;
  context.logger.debug("Queried matchmaking endpoint", { url: url.toString(), payload });
  const bucket = payload[issueUrl];
  if (!bucket) {
    return [];
  }

  return bucket.sortedContributors ?? [];
}
