import type { BaseContext } from "../types/context";

type TokenContext = Pick<BaseContext, "octokit" | "logger">;

export async function getInstallationTokenForOrg(context: TokenContext, org: string): Promise<string | null> {
  const trimmed = org.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const installation = await context.octokit.rest.apps.getOrgInstallation({ org: trimmed });
    const tokenInfo = (await (context.octokit as unknown as { auth: (args: unknown) => Promise<{ token: string }> }).auth({
      type: "installation",
      installationId: installation.data.id,
    })) as { token: string };
    return tokenInfo.token;
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    context.logger.error(`Failed to get installation token for ${trimmed}`, { error: cause });
    return null;
  }
}
