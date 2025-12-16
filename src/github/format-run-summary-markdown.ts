import type { RunSummary } from "./create-run-summary";

function asBullets(lines: string[]): string {
  return lines.map((line) => `- ${line}`).join("\n");
}

function issueLink(owner: string, repo: string, issueNumber: number): string {
  const ref = `${owner}/${repo}#${issueNumber}`;
  const url = `https://github.com/${owner}/${repo}/issues/${issueNumber}`;
  return `[${ref}](${url})`;
}

function formatConsideredTasks(summary: RunSummary): string {
  const header = "### Considered tasks\n";
  if (summary.consideredTasks.length === 0) {
    return `${header}- None\n`;
  }

  const bullets = summary.consideredTasks.map((task) => issueLink(task.owner, task.repo, task.issueNumber));
  return `${header}${asBullets(bullets)}\n`;
}

function formatCandidateAssignments(summary: RunSummary): string {
  const header = "### Available candidates\n";

  if (summary.availableCandidates.length === 0) {
    return `${header}- None\n`;
  }

  const lines: string[] = [];
  lines.push(header);
  lines.push("| Username | Currently assigned tasks |");
  lines.push("| --- | --- |");

  for (const login of summary.availableCandidates) {
    const assigned = summary.assignmentsByCandidate[login] ?? [];
    const tasksCell = assigned.length === 0 ? "None" : assigned.map((task) => issueLink(task.owner, task.repo, task.issueNumber)).join("<br>");
    lines.push(`| @${login} | ${tasksCell} |`);
  }

  return `${lines.join("\n")}\n`;
}

export function formatRunSummaryMarkdown(summary: RunSummary): string {
  const header = "## Daemon Planner\n";
  const mode = `- Dry run: ${summary.dryRun}\n`;

  const considered = formatConsideredTasks(summary);
  const candidates = formatCandidateAssignments(summary);

  const actionsHeader = "### Actions\n";
  const actions = summary.actions.length === 0 ? `${actionsHeader}- None\n` : `${actionsHeader}${asBullets(summary.actions)}\n`;

  return `${header}${mode}${considered}${candidates}${actions}`;
}
