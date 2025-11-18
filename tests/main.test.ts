import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { drop } from "@mswjs/data";
import { customOctokit as Octokit } from "@ubiquity-os/plugin-sdk/octokit";
import { Logs } from "@ubiquity-os/ubiquity-os-logger";
import dotenv from "dotenv";
import manifest from "../manifest.json";
import { runPlugin } from "../src";
import { BaseContext, Env, PluginSettings } from "../src/types";
import { db } from "./__mocks__/db";
import { setupTests } from "./__mocks__/helpers";
import { server } from "./__mocks__/node";
import { STRINGS } from "./__mocks__/strings";

dotenv.config();
const octokit = new Octokit();

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
    const response = await worker.fetch(new Request("http://localhost/manifest.json"), {});
    const content = await response.json();
    expect(content).toEqual(manifest);
  });

  it("Should assign a newly opened issue to the least loaded candidate", async () => {
    const context = createIssueOpenedContext();

    await runPlugin(context);

    const issue = db.issue.findFirst({ where: { number: { equals: 1 } } });
    expect(issue?.assignees?.[0]?.login).toBe("user1");
  });

  it("Should assign unowned issues across configured organizations during the daily schedule", async () => {
    const request = createScheduleContext();

    await runPlugin(request);

    const issue = db.issue.findFirst({ where: { number: { equals: 2 } } });
    const assignees = (issue?.assignees as { login: string }[] | undefined) ?? [];

    expect(assignees.length).toBeGreaterThan(0);
  });
});

function createConfig(overrides: Partial<PluginSettings> = {}): PluginSettings {
  return {
    organizations: ["ubiquity", "ubiquity-os", "ubiquity-os-marketplace"],
    candidateLogins: ["user1", "user2"],
    dailyCapacityHours: 6,
    planningHorizonDays: 5,
    reviewBufferHours: 2,
    defaultEstimateHours: 4,
    ...overrides,
  } as PluginSettings;
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
    env: {} as Env,
    octokit,
  } as unknown as BaseContext<"issues.opened">;
}

function createScheduleContext(overrides: Partial<PluginSettings> = {}): BaseContext {
  return {
    eventName: "cron",
    command: null,
    payload: {},
    logger: new Logs("debug"),
    config: createConfig(overrides),
    env: {} as Env,
    octokit,
  } as unknown as BaseContext;
}
