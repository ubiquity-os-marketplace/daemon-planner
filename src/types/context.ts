import { Context as PluginContext } from "@ubiquity-os/plugin-sdk";
import type { CandidatePool } from "../candidates/candidate-pool";
import type { RunSummary } from "../github/create-run-summary";
import type { TaskPriorityPool } from "../tasks/task-priority-pool";
import { Env } from "./env";
import { PluginSettings } from "./plugin-input";

export type SupportedEvents = "issues.opened" | "issues.reopened" | "issues.closed";

export type BaseContext<T extends SupportedEvents = SupportedEvents> = PluginContext<PluginSettings, Env, null, T>;

export interface PluginAdapters {
  getOrganizationCollaborators(org: string): Promise<string[]>;
}

export type Context<T extends SupportedEvents = SupportedEvents> = BaseContext<T> & {
  adapters: PluginAdapters;
  candidates: CandidatePool;
  tasks: TaskPriorityPool;
  runSummary?: RunSummary;
};
