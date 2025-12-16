import { describe, expect, it } from "@jest/globals";
import { createRunSummary } from "../src/github/create-run-summary";
import { formatRunSummaryMarkdown } from "../src/github/format-run-summary-markdown";

describe("formatRunSummaryMarkdown", () => {
  it("renders considered tasks as bullets and candidates as a table", () => {
    const summary = createRunSummary(true);

    summary.setConsideredTasks([
      { owner: "org-a", repo: "repo-1", issueNumber: 1 },
      { owner: "org-a", repo: "repo-2", issueNumber: 2 },
    ]);

    summary.setAvailableCandidates(["alice", "bob"]);

    summary.addAssignedTask("alice", { owner: "org-a", repo: "repo-1", issueNumber: 1 });
    summary.addAction("Assigned org-a/repo-1#1 to alice");

    const md = formatRunSummaryMarkdown(summary);

    expect(md).toContain("## Daemon Planner");
    expect(md).toContain("### Considered tasks");
    expect(md).toContain("- [org-a/repo-1#1](https://github.com/org-a/repo-1/issues/1)");
    expect(md).toContain("- [org-a/repo-2#2](https://github.com/org-a/repo-2/issues/2)");

    expect(md).toContain("### Available candidates");
    expect(md).toContain("| Username | Currently assigned tasks |");
    expect(md).toContain("| @alice | [org-a/repo-1#1](https://github.com/org-a/repo-1/issues/1) |");
    expect(md).toContain("| @bob | None |");

    expect(md).toContain("### Actions");
    expect(md).toContain("- Assigned org-a/repo-1#1 to alice");
  });
});
