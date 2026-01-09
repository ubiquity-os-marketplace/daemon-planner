import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { drop } from "@mswjs/data";
import { customOctokit as Octokit } from "@ubiquity-os/plugin-sdk/octokit";
import { Logs } from "@ubiquity-os/ubiquity-os-logger";
import { http, HttpResponse } from "msw";
import manifest from "../manifest.json";
import { runPlugin } from "../src";
import { createRunSummary } from "../src/github/create-run-summary";
import type { BaseContext } from "../src/types/context";
import type { Env } from "../src/types/env";
import type { PluginSettings } from "../src/types/plugin-input";
import { db } from "./__mocks__/db";
import { setupTests } from "./__mocks__/helpers";
import issueTemplate from "./__mocks__/issue-template";
import { server } from "./__mocks__/node";
import { STRINGS } from "./__mocks__/strings";

const octokit = new Octokit();
(octokit as unknown as { auth: (...args: unknown[]) => Promise<{ token: string }> }).auth = async () => ({ token: "test-token" });

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => server.close());

describe("Plugin tests", () => {
  beforeEach(async () => {
    drop(db);
    await setupTests();
  });

  it("Should serve the manifest file", async () => {
    const worker = (await import("../src/worker")).default;
    const response = await worker.fetch(new Request("http://localhost/manifest.json"), {
      MATCHMAKING_ENDPOINT: "endpoint",
      START_STOP_ENDPOINT: "endpoint",
      APP_ID: "1234",
      APP_PRIVATE_KEY: "private_key",
    });
    const content = await response.json();
    expect(content).toEqual(manifest);
  });

  it("Should assign a newly opened issue to the least loaded candidate", async () => {
    const context = createIssueOpenedContext();

    await runPlugin(context);

    const issue = db.issue.findFirst({ where: { number: { equals: 1 } } });
    expect(issue?.assignees?.[0]?.login).toBe("user2");
  });

  it("Should honor recommendationThreshold when selecting candidates", async () => {
    server.use(
      http.get("https://command-start-stop-main.deno.dev/start", () => {
        return HttpResponse.json({
          ok: true,
          computed: { assignedIssues: [] },
        });
      }),
      http.get("https://text-vector-embeddings-mai.deno.dev/recommendations", ({ request }) => {
        const url = new URL(request.url);
        const issueUrl = url.searchParams.get("issueUrls") ?? "https://github.com/ubiquity/test-repo/issues/1";

        return HttpResponse.json({
          [issueUrl]: {
            matchResultArray: {},
            similarIssues: [],
            sortedContributors: [
              { login: "user1", matches: [], maxSimilarity: 0.3 },
              { login: "user2", matches: [], maxSimilarity: 0.9 },
            ],
          },
        });
      })
    );

    const context = createIssueOpenedContext({ recommendationThreshold: 0.5 });

    await runPlugin(context);

    const issue = db.issue.findFirst({ where: { number: { equals: 1 } } });
    expect(issue?.assignees?.[0]?.login).toBe("user2");
  });

  it("Should exclude candidates that are not allowed to start", async () => {
    server.use(
      http.get("https://command-start-stop-main.deno.dev/start", ({ request }) => {
        const url = new URL(request.url);
        const userId = url.searchParams.get("userId");

        if (userId === "2") {
          return HttpResponse.json({
            ok: false,
            computed: { assignedIssues: [{ title: "not allowed", html_url: "https://github.com/ubiquity/os/issues/3" }] },
          });
        }

        return HttpResponse.json({
          ok: true,
          computed: { assignedIssues: [{ title: "already working", html_url: "https://github.com/ubiquity/os/issues/3" }] },
        });
      })
    );

    const context = createIssueOpenedContext();

    await runPlugin(context);

    const issue = db.issue.findFirst({ where: { number: { equals: 1 } } });
    const assignees = (issue?.assignees as { login: string }[] | undefined) ?? [];
    expect(assignees.length).toBe(0);
  });

  it("Should include match percentage in GitHub summary actions", async () => {
    const context = createIssueOpenedContext({ dryRun: true });
    (context as unknown as { runSummary: ReturnType<typeof createRunSummary> }).runSummary = createRunSummary(true);

    await runPlugin(context);

    const summary = (context as unknown as { runSummary: ReturnType<typeof createRunSummary> }).runSummary;
    const plans = summary.candidates.flatMap((entry) => entry.assignPlans ?? []).join("\n");
    expect(plans).toContain("(30%)");
  });

  it("Should not assign users across organizations", async () => {
    server.use(
      http.get("https://api.github.com/orgs/:org/members", ({ params: { org } }: { params: { org: string } }) => {
        if (org === "ubiquity") {
          return HttpResponse.json([{ login: "user1" }]);
        }
        if (org === "ubiquity-os") {
          return HttpResponse.json([{ login: "user2" }]);
        }
        return HttpResponse.json([]);
      })
    );

    const preseeded = db.issue.findFirst({ where: { id: { equals: 3 } } });
    if (preseeded) {
      db.issue.update({
        where: { id: { equals: preseeded.id as number } },
        data: {
          ...preseeded,
          assignees: [],
          assignee: null,
        },
      });
    }

    db.issue.create({
      ...issueTemplate,
      id: 100,
      owner: "ubiquity-os",
      repo: STRINGS.TEST_REPO,
      html_url: "https://github.com/ubiquity-os/test-repo/issues/10",
      repository_url: "https://github.com/ubiquity-os/test-repo",
      number: 10,
      title: "org-b task",
      assignees: [],
      assignee: null,
      labels: [{ name: "Time: <1 Hour" }, { name: "Priority: 1 (Normal)" }, { name: "Price: 1 USD" }],
      updated_at: new Date().toISOString(),
    });

    const context = createIssueOpenedContext();

    await runPlugin(context);

    const ubiquityIssue = db.issue.findFirst({ where: { owner: { equals: "ubiquity" }, number: { equals: 1 } } });
    expect(((ubiquityIssue?.assignees as { login: string }[] | undefined) ?? [])[0]?.login).toBe("user1");

    const ubiquityOsIssue = db.issue.findFirst({ where: { owner: { equals: "ubiquity-os" }, number: { equals: 10 } } });
    expect(((ubiquityOsIssue?.assignees as { login: string }[] | undefined) ?? [])[0]?.login).toBe("user2");
  });

  it("Should normalize matchmaking similarity returned as 0..100", async () => {
    server.use(
      http.get("https://command-start-stop-main.deno.dev/start", () => {
        return HttpResponse.json({
          ok: true,
          computed: { assignedIssues: [] },
        });
      }),
      http.get("https://text-vector-embeddings-mai.deno.dev/recommendations", ({ request }) => {
        const url = new URL(request.url);
        const issueUrl = url.searchParams.get("issueUrls") ?? "https://github.com/ubiquity/test-repo/issues/1";

        return HttpResponse.json({
          [issueUrl]: {
            matchResultArray: {},
            similarIssues: [],
            sortedContributors: [
              { login: "user1", matches: [], maxSimilarity: 77 },
              { login: "user2", matches: [], maxSimilarity: 77 },
            ],
          },
        });
      })
    );

    const context = createIssueOpenedContext({ dryRun: true });
    (context as unknown as { runSummary: ReturnType<typeof createRunSummary> }).runSummary = createRunSummary(true);

    await runPlugin(context);

    const summary = (context as unknown as { runSummary: ReturnType<typeof createRunSummary> }).runSummary;
    const plans = summary.candidates.flatMap((entry) => entry.assignPlans ?? []).join("\n");
    expect(plans).toContain("(77%)");
    expect(plans).not.toContain("(7700%)");
  });
});

function createConfig(overrides: Partial<PluginSettings> = {}): PluginSettings {
  return {
    organizations: ["ubiquity", "ubiquity-os", "ubiquity-os-marketplace"],
    assignedTaskLimit: 1,
    defaultEstimateHours: 4,
    ...overrides,
  } as PluginSettings;
}

function createEnv(): Env {
  return {
    MATCHMAKING_ENDPOINT: "https://text-vector-embeddings-mai.deno.dev",
    START_STOP_ENDPOINT: "https://command-start-stop-main.deno.dev",
    APP_ID: "1",
    APP_PRIVATE_KEY: "key",
  } as Env;
}

function createIssueOpenedContext(overrides: Partial<PluginSettings> = {}): BaseContext<"issues.opened"> {
  const repo = db.repo.findFirst({ where: { id: { equals: 1 } } }) as unknown as BaseContext<"issues.opened">["payload"]["repository"];
  const issue = db.issue.findFirst({ where: { id: { equals: 1 } } }) as unknown as BaseContext<"issues.opened">["payload"]["issue"];
  const sender = db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as BaseContext<"issues.opened">["payload"]["sender"];

  return {
    eventName: "issues.opened",
    command: null,
    payload: {
      action: "opened",
      issue,
      repository: repo,
      sender,
      installation: { id: 1 } as BaseContext<"issues.opened">["payload"]["installation"],
      organization: { login: STRINGS.USER_1 } as BaseContext<"issues.opened">["payload"]["organization"],
    },
    logger: new Logs("debug"),
    config: createConfig(overrides),
    env: createEnv(),
    octokit,
  } as unknown as BaseContext<"issues.opened">;
}
