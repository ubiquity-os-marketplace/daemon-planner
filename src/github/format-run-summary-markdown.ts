import type { RunSummary } from "./create-run-summary";

function asBullets(lines: string[]): string {
  return lines.map((line) => `- ${line}`).join("\n");
}

export function formatRunSummaryMarkdown(summary: RunSummary): string {
  const header = "## Daemon Planner\n";
  const mode = `- Dry run: ${summary.dryRun}\n`;

  if (summary.actions.length === 0) {
    return `${header}${mode}- Actions: none\n`;
  }

  const actions = `${mode}- Actions:\n${asBullets(summary.actions)}\n`;
  return `${header}${actions}`;
}
