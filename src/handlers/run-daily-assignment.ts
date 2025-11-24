import { Context } from "../types/index";
import { planAssignment } from "./planner/plan-assignment";

async function assignUnownedIssues(context: Context, owner: string, repo: string) {
  const issues = await context.octokit.paginate(context.octokit.rest.issues.listForRepo, {
    owner,
    repo,
    state: "open",
    assignee: "none",
    per_page: 100,
  });

  for (const issue of issues) {
    await planAssignment(context, { owner, name: repo }, issue);
  }
}

async function processOrganization(context: Context, org: string) {
  const repositories = await context.octokit.paginate(
    context.octokit.rest.repos.listForOrg,
    {
      org,
      type: "public",
      per_page: 100,
    },
    (response) => response.data.filter((repository) => !repository.archived && !repository.private)
  );

  for (const repository of repositories) {
    await assignUnownedIssues(context, repository.owner?.login ?? org, repository.name);
  }
}

export async function runDailyAssignment(context: Context) {
  for (const org of context.config.organizations) {
    try {
      await processOrganization(context, org);
    } catch (error) {
      const cause = error instanceof Error ? error : new Error(String(error));
      context.logger.error(`Failed to process organization ${org}`, { error: cause });
    }
  }
}
