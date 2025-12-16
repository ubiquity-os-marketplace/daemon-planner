import type { RunSummary } from "./create-run-summary";

function asBullets(lines: string[]): string {
  return lines.map((line) => `- ${line}`).join("\n");
}

function issueLink(owner: string, repo: string, issueNumber: number): string {
  const ref = `${owner}/${repo}#${issueNumber}`;
  const url = `https://github.com/${owner}/${repo}/issues/${issueNumber}`;
  return `[${ref}](${url})`;
}

function issueLinkFromUrl(url: string): string {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)(?:$|[?#])/.exec(url);
  if (!match) {
    return `[link](${url})`;
  }

  return issueLink(match[1], match[2], Number(match[3]));
}

function formatConsideredTasks(summary: RunSummary): string {
  const header = "### Considered tasks\n";
  if (summary.consideredTasks.length === 0) {
    return `${header}- None\n`;
  }

  const bullets = summary.consideredTasks.map((task) => issueLink(task.owner, task.repo, task.issueNumber));
  return `${header}${asBullets(bullets)}\n`;
}

function formatCandidates(summary: RunSummary): string {
  const header = "### Candidates\n";

  if (summary.candidates.length === 0) {
    return `${header}- None\n`;
  }

  const lines: string[] = [];
  lines.push(header);
  lines.push("| Username | Availability | Assigned issues |");
  lines.push("| --- | --- | --- |");

  for (const candidate of summary.candidates) {
    const availability = candidate.isAvailable ? "🟢" : "🔴";
    const assignedCell = candidate.assignedIssueUrls.length === 0 ? "None" : candidate.assignedIssueUrls.map((url) => issueLinkFromUrl(url)).join("<br>");
    lines.push(`| @${candidate.login} | ${availability} | ${assignedCell} |`);
  }

  return `${lines.join("\n")}\n`;
}

export function formatRunSummaryMarkdown(summary: RunSummary): string {
  const header = "## Daemon Planner\n";
  const mode = `- Dry run: ${summary.dryRun}\n`;

  const considered = formatConsideredTasks(summary);
  const candidates = formatCandidates(summary);

  const actionsHeader = "### Actions\n";
  const actions = summary.actions.length === 0 ? `${actionsHeader}- None\n` : `${actionsHeader}${asBullets(summary.actions)}\n`;

  return `${header}${mode}${considered}${candidates}${actions}`;
}
