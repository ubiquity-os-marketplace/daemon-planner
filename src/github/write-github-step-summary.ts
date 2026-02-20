import { appendFile } from "node:fs/promises";

export async function writeGithubStepSummary(markdown: string): Promise<boolean> {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return false;
  }

  const payload = markdown.endsWith("\n") ? markdown : `${markdown}\n`;
  await appendFile(summaryPath, payload, { encoding: "utf8" });
  return true;
}
