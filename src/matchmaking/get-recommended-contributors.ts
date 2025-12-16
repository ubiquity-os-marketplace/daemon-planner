import type { operations } from "../types/generated/matchmaking";

type RecommendationsResponse = operations["getRecommendations"]["responses"][200]["content"]["application/json"];
type RecommendationBucket = NonNullable<RecommendationsResponse[string]>;
export type RecommendedContributor = RecommendationBucket["sortedContributors"][number];

export async function getRecommendedContributors(matchmakingEndpoint: string, issueUrl: string): Promise<RecommendedContributor[]> {
  const url = new URL("/recommendations", matchmakingEndpoint);
  url.searchParams.append("issueUrls", issueUrl);

  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) {
    throw new Error(`Matchmaking recommendations request failed (${response.status} ${response.statusText})`);
  }

  const payload = (await response.json()) as RecommendationsResponse;
  const bucket = payload[issueUrl];
  if (!bucket) {
    return [];
  }

  return bucket.sortedContributors ?? [];
}
