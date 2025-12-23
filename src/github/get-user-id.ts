import type { Context } from "../types/context";

const cache = new Map<string, Promise<string>>();

export function getUserId(octokit: Context["octokit"], username: string): Promise<string> {
  const normalized = username.trim();
  if (!normalized) {
    return Promise.resolve("");
  }

  const cached = cache.get(normalized);
  if (cached) {
    return cached;
  }

  const pending = octokit.rest.users.getByUsername({ username: normalized }).then((response) => response.data.id.toString());
  cache.set(normalized, pending);
  return pending;
}
