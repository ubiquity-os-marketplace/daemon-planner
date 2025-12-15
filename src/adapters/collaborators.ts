import { BaseContext } from "../types/context";

function normalizeCollaborator(entry: unknown): string | null {
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

export async function fetchOrganizationCollaborators(context: BaseContext, org: string): Promise<string[]> {
  try {
    const collaborators = await context.octokit.paginate(context.octokit.rest.orgs.listMembers, {
      org,
      per_page: 100,
    });

    return collaborators.map(normalizeCollaborator).filter((login): login is string => Boolean(login));
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    context.logger.error(`Failed to fetch collaborators for ${org}`, { error: cause });
    return [];
  }
}
