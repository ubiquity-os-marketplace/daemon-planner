import { Context, PluginAdapters } from "../types/context";
import { fetchOrganizationCollaborators } from "./collaborators";

export function createAdapters(context: Pick<Context, "octokits" | "logger">): PluginAdapters {
  return {
    getOrganizationCollaborators: (org) => fetchOrganizationCollaborators(context, org),
  };
}
