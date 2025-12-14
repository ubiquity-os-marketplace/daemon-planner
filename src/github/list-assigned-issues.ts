import { Context } from "@ubiquity-os/plugin-sdk";
import { Logs } from "@ubiquity-os/ubiquity-os-logger";
import { PlannerIssue } from "../handlers/planner/types";

export async function listAssignedIssues(octokit: Context["octokit"], logger: Logs, organizations: string[], login: string): Promise<PlannerIssue[]> {
  const allowedOwners = new Set(organizations.map((org) => org.trim()).filter((org) => Boolean(org)));
  const assigned: PlannerIssue[] = [];

  let repositories: Array<{ name: string; owner?: { login?: string | null } | null }> = [];
  try {
    repositories = await octokit.paginate(octokit.rest.apps.listReposAccessibleToInstallation, { per_page: 100 });
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    logger.error("Failed to list repositories accessible to installation", { error: cause });
    return [];
  }

  const eligible = repositories.filter((repo) => {
    const owner = repo.owner?.login?.trim();
    return Boolean(owner) && allowedOwners.has(owner as string);
  });

  for (const repo of eligible) {
    const owner = repo.owner?.login;
    if (!owner) {
      continue;
    }

    try {
      const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
        owner,
        repo: repo.name,
        assignee: login,
        state: "open",
        per_page: 100,
      });
      assigned.push(...(issues as PlannerIssue[]));
    } catch (error) {
      const cause = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to read assigned issues for ${login} in ${owner}/${repo.name}`, { error: cause });
    }
  }

  return assigned;
}
