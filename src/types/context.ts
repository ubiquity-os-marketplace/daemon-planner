import { Context as PluginContext } from "@ubiquity-os/plugin-sdk";
import type { CollaboratorPool } from "../collaborators/collaborator-pool";
import type { TaskPriorityPool } from "../tasks/task-priority-pool";
import { Env } from "./env";
import { PluginSettings } from "./plugin-input";

export type SupportedEvents = "issues.opened" | "issues.reopened";

export type BaseContext<T extends SupportedEvents = SupportedEvents> = PluginContext<PluginSettings, Env, null, T>;

export interface PluginAdapters {
  getOrganizationCollaborators(org: string): Promise<string[]>;
}

export type Context<T extends SupportedEvents = SupportedEvents> = BaseContext<T> & {
  adapters: PluginAdapters;
  collaborators: CollaboratorPool;
  tasks: TaskPriorityPool;
};
