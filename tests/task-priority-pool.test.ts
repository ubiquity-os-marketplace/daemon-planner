import { describe, expect, it } from "@jest/globals";
import { TaskPriorityPool } from "../src/tasks/task-priority-pool";
import type { PluginSettings } from "../src/types/plugin-input";

function createOctokitStub() {
  const calls: string[] = [];

  const accessibleRepos: Array<{ name: string; archived: boolean; private: boolean; owner?: { login?: string } }> = [];
  const issuesByRepo = new Map<string, Array<{ number: number; labels?: Array<{ name?: string | null } | string | null> }>>();

  function emptyListResponse(kind: "installation" | "repo", params: unknown) {
    if (kind === "installation" && params === null) {
      return { data: [] };
    }
    return { data: [] };
  }

  const listReposAccessibleToInstallation = async (params: unknown) => emptyListResponse("installation", params);
  const listForRepo = async (params: unknown) => emptyListResponse("repo", params);

  const octokit = {
    rest: {
      apps: {
        listReposAccessibleToInstallation,
      },
      issues: {
        listForRepo,
      },
    },
    paginate: async (method: unknown, params: { org?: string; owner?: string; repo?: string }, mapFn?: (response: { data: unknown[] }) => unknown[]) => {
      if (method === listReposAccessibleToInstallation) {
        calls.push("apps.listReposAccessibleToInstallation");
        if (mapFn) {
          throw new Error("Unexpected mapFn for listReposAccessibleToInstallation");
        }
        return accessibleRepos;
      }

      if (method === listForRepo) {
        calls.push(`issues.listForRepo:${params.owner ?? ""}/${params.repo ?? ""}`);
        return issuesByRepo.get(`${params.owner ?? ""}/${params.repo ?? ""}`) ?? [];
      }

      throw new Error("Unknown paginate method");
    },
  };

  return {
    octokit,
    calls,
    accessibleRepos,
    issuesByRepo,
  };
}

describe("TaskPriorityPool", () => {
  it("merges tasks across orgs/repos, sorts by priority desc, and caches fetches", async () => {
    const stub = createOctokitStub();

    stub.accessibleRepos.push(
      { name: "repo-1", archived: false, private: false, owner: { login: "org-a" } },
      { name: "repo-2", archived: false, private: false, owner: { login: "org-a" } },
      { name: "repo-archived", archived: true, private: false, owner: { login: "org-a" } },
      { name: "repo-3", archived: false, private: false, owner: { login: "org-b" } },
      { name: "repo-outside", archived: false, private: false, owner: { login: "org-c" } }
    );

    stub.issuesByRepo.set("org-a/repo-1", [
      { number: 1, labels: [{ name: "Priority: 5 (High)" }, { name: "Time: <1 Hour" }] },
      { number: 2, labels: [{ name: "Priority: 1 (Low)" }, { name: "Time: <1 Hour" }] },
    ]);
    stub.issuesByRepo.set("org-a/repo-2", [
      { number: 3, labels: [{ name: "Priority: 10 (Critical)" }, { name: "Time: <1 Hour" }] },
      { number: 99, labels: [{ name: "Time: <1 Hour" }] },
    ]);
    stub.issuesByRepo.set("org-b/repo-3", [
      { number: 4, labels: [{ name: "Priority: 2 (Normal)" }, { name: "Time: <1 Hour" }] },
      { number: 100, labels: [{ name: "Priority: 999 (Oops)" }] },
    ]);

    const config = {
      organizations: ["org-a", "org-b"],
      dailyCapacityHours: 6,
      planningHorizonDays: 5,
      reviewBufferHours: 2,
      assignedTaskLimit: 1,
    } as PluginSettings;

    const context = {
      octokit: stub.octokit,
      config,
      logger: {
        error: () => undefined,
      },
    } as unknown as { octokit: typeof stub.octokit; config: PluginSettings; logger: { error: (msg: string, data?: unknown) => void } };

    const pool = new TaskPriorityPool(context as never);

    const first = await pool.getSortedAvailableTasks();
    const second = await pool.getSortedAvailableTasks();

    expect(first.map((task) => `${task.repository.owner}/${task.repository.name}#${task.issue.number}`)).toEqual([
      "org-a/repo-2#3",
      "org-a/repo-1#1",
      "org-b/repo-3#4",
      "org-a/repo-1#2",
    ]);

    expect(second.map((task) => task.issue.number)).toEqual([3, 1, 4, 2]);

    const repoCalls = stub.calls.filter((call) => call === "apps.listReposAccessibleToInstallation");
    const issueCalls = stub.calls.filter((call) => call.startsWith("issues.listForRepo:"));

    expect(repoCalls).toHaveLength(1);
    expect(issueCalls).toHaveLength(3);
  });
});
