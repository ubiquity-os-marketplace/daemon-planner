import { createAppAuth } from "@octokit/auth-app";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import type { BaseContext } from "../types/context";

type TokenContext = Pick<BaseContext, "octokit" | "logger" | "env">;

export async function getOrgAuthenticatedOctokit(context: TokenContext, org: string): Promise<InstanceType<typeof customOctokit>> {
  const { env, logger } = context;
  const trimmedOrg = org.trim();

  if (!trimmedOrg) {
    throw logger.error(`Invalid org name for authenticated octokit: ${org}`);
  }

  if (!env.APP_ID || !env.APP_PRIVATE_KEY) {
    logger.debug("APP_ID or APP_PRIVATE_KEY are missing from the env, will use the default Octokit instance.");
    return context.octokit;
  } else {
    try {
      const appOctokit = new customOctokit({
        authStrategy: createAppAuth,
        auth: {
          appId: env.APP_ID,
          privateKey: env.APP_PRIVATE_KEY,
        },
      });
      const installation = await appOctokit.rest.apps.getOrgInstallation({
        org: trimmedOrg,
      });
      logger.debug(`Getting installation token for ${trimmedOrg} (installation ID: ${installation.data.id})`);
      return new customOctokit({
        authStrategy: createAppAuth,
        auth: {
          appId: context.env.APP_ID,
          privateKey: context.env.APP_PRIVATE_KEY,
          installationId: installation.data.id,
        },
      });
    } catch (err) {
      context.logger.error(`Failed to get installation token for ${trimmedOrg}`, { err });
      return context.octokit;
    }
  }
}
