import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { getOrgAuthenticatedOctokit } from "../github/get-org-authenticated-octokit";
import { estimateIssueHours } from "../handlers/planner/estimate-issue-hours";
import { PlannerIssue, PlannerLabel, RepositoryRef } from "../handlers/planner/types";
import { Context } from "../types/context";

export interface TaskRef {
  repository: RepositoryRef;
  issue: PlannerIssue;
}

function labelName(label: PlannerLabel | string): string {
  if (typeof label === "string") {
    return label;
  }

  return label?.name ?? String();
}

function parsePriorityFromLabel(label: string): number | null {
  const match = /^Priority:\s*(\d+)\s*\(/i.exec(label.trim());
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

export class TaskPriorityPool {
  private readonly _context: Pick<Context, "octokit" | "config" | "logger">;
  private _cachedTasks: Promise<TaskRef[]> | null = null;
  private readonly _orgTokenCache = new Map<string, Promise<InstanceType<typeof customOctokit> | null>>();

  constructor(context: Pick<Context, "octokit" | "config" | "logger">) {
    this._context = context;
  }

  private _getOrgOctokit(org: string): Promise<InstanceType<typeof customOctokit> | null> {
    const key = org.trim();
    if (!key) {
      return Promise.resolve(null);
    }

    const cached = this._orgTokenCache.get(key);
    if (cached) {
      return cached;
    }

    const pending = getOrgAuthenticatedOctokit(this._context as never, key);
    this._orgTokenCache.set(key, pending);
    return pending;
  }

  private static _getIssuePriorityOrNull(issue: PlannerIssue): number | null {
    const labels = (issue.labels?.filter((label) => !!label) as Array<string | PlannerLabel>) ?? [];

    let best: number | null = null;
    for (const label of labels) {
      const parsed = parsePriorityFromLabel(labelName(label));
      if (parsed !== null && (best === null || parsed > best)) {
        best = parsed;
      }
    }

    return best;
  }

  static getIssuePriority(issue: PlannerIssue): number {
    return TaskPriorityPool._getIssuePriorityOrNull(issue) ?? 0;
  }

  private static _compareTasks(a: TaskRef, b: TaskRef): number {
    const priorityA = TaskPriorityPool.getIssuePriority(a.issue);
    const priorityB = TaskPriorityPool.getIssuePriority(b.issue);

    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }

    if (a.repository.owner !== b.repository.owner) {
      return a.repository.owner.localeCompare(b.repository.owner);
    }

    if (a.repository.name !== b.repository.name) {
      return a.repository.name.localeCompare(b.repository.name);
    }

    return a.issue.number - b.issue.number;
  }

  async getAvailableTasks(): Promise<TaskRef[]> {
    if (this._cachedTasks) {
      return this._cachedTasks;
    }

    this._cachedTasks = this._fetchAvailableTasks();
    return this._cachedTasks;
  }

  async getSortedAvailableTasks(): Promise<TaskRef[]> {
    const tasks = await this.getAvailableTasks();
    return [...tasks].sort(TaskPriorityPool._compareTasks);
  }

  private _isEligibleIssue(issue: PlannerIssue): boolean {
    if (!issue?.number) {
      return false;
    }

    const hasPriority = TaskPriorityPool._getIssuePriorityOrNull(issue) !== null;
    const hasTime = estimateIssueHours(issue, this._context.config) !== null;

    return hasPriority && hasTime;
  }

  private async _listAccessibleRepositories(
    octokit?: InstanceType<typeof customOctokit> | null
  ): Promise<Array<{ name: string; archived?: boolean; private?: boolean; owner?: { login?: string | null } | null }>> {
    try {
      return await (octokit ?? this._context.octokit).paginate(this._context.octokit.rest.apps.listReposAccessibleToInstallation, {
        per_page: 100,
      });
    } catch (error) {
      const cause = error instanceof Error ? error : new Error(String(error));
      this._context.logger.error("Failed to list repositories accessible to installation", { error: cause });
      return [];
    }
  }

  private async _listUnassignedIssues(owner: string, repo: string, octokit?: InstanceType<typeof customOctokit> | null): Promise<PlannerIssue[]> {
    try {
      return await (octokit ?? this._context.octokit).paginate(this._context.octokit.rest.issues.listForRepo, {
        owner,
        repo,
        state: "open",
        assignee: "none",
        per_page: 100,
      });
    } catch (error) {
      const cause = error instanceof Error ? error : new Error(String(error));
      this._context.logger.error(`Failed to list issues for ${owner}/${repo}`, { error: cause });
      return [];
    }
  }

  private async _fetchAvailableTasks(): Promise<TaskRef[]> {
    const tasks: TaskRef[] = [];

    const organizations = Array.from(new Set(this._context.config.organizations.map((org) => org.trim()).filter((org) => Boolean(org))));

    for (const org of organizations) {
      const octokit = await this._getOrgOctokit(org);
      const repositories = await this._listAccessibleRepositories(octokit);
      const eligibleRepos = repositories.filter((repository) => {
        const owner = repository.owner?.login?.trim();
        if (!owner || owner.toLowerCase() !== org.toLowerCase()) {
          return false;
        }

        return !(repository.archived || repository.private);
      });

      for (const repository of eligibleRepos) {
        const owner = repository.owner?.login;
        if (!owner) {
          continue;
        }

        const repo = repository.name;
        const issues = await this._listUnassignedIssues(owner, repo, octokit);

        for (const issue of issues) {
          if (!this._isEligibleIssue(issue)) {
            continue;
          }

          tasks.push({
            repository: { owner, name: repo },
            issue,
          });
        }
      }
    }

    return tasks;
  }
}
