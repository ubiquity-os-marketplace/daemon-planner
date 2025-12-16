import { createActionsPlugin, Options } from "@ubiquity-os/plugin-sdk";
import { LOG_LEVEL, LogLevel } from "@ubiquity-os/ubiquity-os-logger";
import { createRunSummary } from "./github/create-run-summary";
import { formatRunSummaryMarkdown } from "./github/format-run-summary-markdown";
import { writeGithubStepSummary } from "./github/write-github-step-summary";
import { runPlugin } from "./index";
import { SupportedEvents } from "./types/context";
import { Env, envSchema } from "./types/env";
import { PluginSettings, pluginSettingsSchema } from "./types/plugin-input";

export default createActionsPlugin<PluginSettings, Env, null, SupportedEvents>(
  async (context) => {
    const runSummary = createRunSummary(context.config.dryRun);
    (context as { runSummary?: ReturnType<typeof createRunSummary> }).runSummary = runSummary;

    try {
      return await runPlugin(context);
    } finally {
      try {
        await writeGithubStepSummary(formatRunSummaryMarkdown(runSummary));
      } catch (err) {
        context.logger.warn("Failed to write GitHub run summary", { err: String(err) });
      }
    }
  },
  {
    logLevel: (process.env.LOG_LEVEL as LogLevel) || LOG_LEVEL.INFO,
    settingsSchema: pluginSettingsSchema as unknown as Options["settingsSchema"],
    envSchema: envSchema as unknown as Options["envSchema"],
    ...(process.env.KERNEL_PUBLIC_KEY && { kernelPublicKey: process.env.KERNEL_PUBLIC_KEY }),
    postCommentOnError: false,
    bypassSignatureVerification: process.env.NODE_ENV === "local",
  }
);
