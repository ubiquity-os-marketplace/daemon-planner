import { RestEndpointMethodTypes } from "@ubiquity-os/plugin-sdk/octokit";
import type { Context } from "../types/context";

export async function fetchOrganizationCollaborators(
  context: Pick<Context, "octokits" | "octokit" | "logger" | "env">,
  org: string
): Promise<RestEndpointMethodTypes["orgs"]["listMembers"]["response"]["data"]> {
  try {
    const octokit = await context.octokits.get(org);

    return await octokit.paginate(octokit.rest.orgs.listMembers, {
      org,
      per_page: 100,
    });
  } catch (err) {
    context.logger.error(`Failed to fetch collaborators for ${org}`, { err });
    return [];
  }
}
