import { describe, expect, it } from "@jest/globals";
import { createRunSummary } from "../src/github/create-run-summary";
import { formatRunSummaryMarkdown } from "../src/github/format-run-summary-markdown";

describe("formatRunSummaryMarkdown", () => {
  it("renders considered tasks as bullets and candidates with availability + assigned issues", () => {
    const summary = createRunSummary(true);

    summary.setConsideredTasks([
      { owner: "org-a", repo: "repo-1", issueNumber: 1 },
      { owner: "org-a", repo: "repo-2", issueNumber: 2 },
    ]);

    summary.setCandidates([
      { login: "alice", isAvailable: true, assignedIssueUrls: [] },
      { login: "bob", isAvailable: false, assignedIssueUrls: ["https://github.com/org-a/repo-1/issues/1"] },
    ]);
    summary.addCandidateDryRunPlan("alice", "https://github.com/org-a/repo-1/issues/1 (50%)");
    summary.addAction("Selected 2 task(s), 1/2 candidate(s) available");

    const md = formatRunSummaryMarkdown(summary);

    expect(md).toContain("## Daemon Planner");
    expect(md).toContain("### Considered tasks");
    expect(md).toContain("- [org-a/repo-1#1](https://github.com/org-a/repo-1/issues/1)");
    expect(md).toContain("- [org-a/repo-2#2](https://github.com/org-a/repo-2/issues/2)");

    expect(md).toContain("### Candidates");
    expect(md).toContain("| Username | Availability | Assigned issues | Assignment Plan |");
    expect(md).toContain("| @alice | 🟢 | None | https://github.com/org-a/repo-1/issues/1 (50%) |");
    expect(md).toContain("| @bob | 🔴 | [org-a/repo-1#1](https://github.com/org-a/repo-1/issues/1) |  |");

    expect(md).toContain("### Actions");
    expect(md).toContain("- Selected 2 task(s), 1/2 candidate(s) available");

    const actionsSection = md.split("### Actions")[1] ?? "";
    expect(actionsSection).not.toContain("https://github.com/org-a/repo-1/issues/1 (50%)");
  });
});
