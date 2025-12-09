import { BaseContext, PluginAdapters } from "../types/index";
import { fetchOrganizationCollaborators } from "./collaborators";

export function createAdapters(context: BaseContext): PluginAdapters {
  return {
    getOrganizationCollaborators: (org) => fetchOrganizationCollaborators(context, org),
  };
}
