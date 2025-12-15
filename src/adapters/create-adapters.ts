import { BaseContext, PluginAdapters } from "../types/context";
import { fetchOrganizationCollaborators } from "./collaborators";

export function createAdapters(context: BaseContext): PluginAdapters {
  return {
    getOrganizationCollaborators: (org) => fetchOrganizationCollaborators(context, org),
  };
}
