import { Context, PluginAdapters } from "../types/context";
import { fetchOrganizationCollaborators } from "./collaborators";

export function createAdapters(context: Pick<Context, "octokit" | "logger" | "env" | "octokits">): PluginAdapters {
  return {
    getOrganizationCollaborators: (org) => fetchOrganizationCollaborators(context, org),
  };
}
