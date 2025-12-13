import { PlannerContext, PlannerIssue } from "./types";

export async function getAssignedIssues(context: PlannerContext, login: string): Promise<PlannerIssue[]> {
  const results: PlannerIssue[] = [];

  for (const org of context.config.organizations) {
    try {
      const repos = await context.octokit.paginate(context.octokit.rest.apps.listReposAccessibleToInstallation, { per_page: 100 });

      for (const repo of repos) {
        const issues = await context.octokit.paginate(context.octokit.rest.issues.listForRepo, {
          owner: repo.owner.login,
          repo: repo.name,
          assignee: login,
          state: "open",
          per_page: 100,
        });

        results.push(...issues);
      }
    } catch (error) {
      const cause = error instanceof Error ? error : new Error(String(error));
      context.logger.error(`Failed to read workload for ${login} in ${org}`, { error: cause });
    }
  }

  return results;
}
