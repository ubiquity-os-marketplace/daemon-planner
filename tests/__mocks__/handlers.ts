import { http, HttpResponse } from "msw";
import { db } from "./db";
import issueTemplate from "./issue-template";
/**
 * Intercepts the routes and returns a custom payload
 */
export const handlers = [
  http.get("https://api.github.com/orgs/:org/members", () => HttpResponse.json(db.users.getAll())),
  http.get("https://api.github.com/installation/repositories", () =>
    HttpResponse.json({ total_count: db.repo.getAll().length, repositories: db.repo.getAll() })
  ),
  http.post("https://text-vector-embeddings-mai.deno.dev", async ({ request }) => {
    const body = await request.json();
    const candidates = Array.isArray((body as { candidates?: unknown }).candidates) ? (body as { candidates?: unknown }).candidates : [];
    return HttpResponse.json({ candidates });
  }),
  http.get("https://text-vector-embeddings-mai.deno.dev/recommendations", () => HttpResponse.json({ candidates: ["user2", "user1"] })),
  http.get("https://command-start-stop-main.deno.dev/start", ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const issueUrl = url.searchParams.get("issueUrl");

    if (!userId || !issueUrl) {
      return new HttpResponse(null, { status: 400 });
    }

    return HttpResponse.json({
      ok: true,
      computed: {
        assignedIssues: [],
      },
    });
  }),
  http.post("https://command-start-stop-main.deno.dev/start", async ({ request }) => {
    const body = (await request.json()) as {
      issueUrl?: string;
      userId?: string;
    };

    const issueUrl = body.issueUrl;
    const userId = body.userId;

    if (!issueUrl || !userId) {
      return new HttpResponse(null, { status: 400 });
    }

    const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)$/.exec(issueUrl);
    if (!match) {
      return new HttpResponse(null, { status: 400 });
    }

    const owner = match[1];
    const repo = match[2];
    const issueNumber = Number(match[3]);

    const issue = db.issue.findFirst({
      where: {
        owner: { equals: owner },
        repo: { equals: repo },
        number: { equals: issueNumber },
      },
    });

    if (!issue) {
      return new HttpResponse(null, { status: 404 });
    }

    const existing = (issue.assignees as { login: string }[] | undefined) ?? [];
    const next = Array.from(new Set([...existing.map((entry) => entry.login), userId])).map((login) => ({ login }));

    db.issue.update({
      where: {
        id: {
          equals: issue.id as number,
        },
      },
      data: {
        ...issue,
        assignees: next,
        assignee: next[0] ?? null,
      },
    });

    return HttpResponse.json({
      ok: true,
      content: "",
      metadata: {
        deadline: null,
        isTaskStale: false,
        wallet: "",
        toAssign: next.map((entry) => entry.login),
        senderRole: "",
        consideredCount: next.length,
        assignedIssues: [],
      },
    });
  }),
  // get org repos
  http.get("https://api.github.com/orgs/:org/repos", ({ params: { org } }: { params: { org: string } }) =>
    HttpResponse.json(db.repo.findMany({ where: { owner: { login: { equals: org } } } }))
  ),
  // get org issues
  http.get("https://api.github.com/orgs/:org/issues", ({ params: { org }, request }) => {
    const url = new URL(request.url);
    const assignee = url.searchParams.get("assignee");
    const state = url.searchParams.get("state") ?? "open";

    const collection = db.issue
      .findMany({ where: { owner: { equals: org as string } } })
      .filter((issue) => {
        if (state && issue.state !== state) {
          return false;
        }

        if (!assignee) {
          return true;
        }

        const list = (issue.assignees as { login: string }[] | undefined) ?? [];
        return list.some((entry) => entry.login === assignee);
      });

    return HttpResponse.json(collection);
  }),
  // get org repo issues
  http.get("https://api.github.com/repos/:owner/:repo/issues", ({ params: { owner, repo }, request }) => {
    const url = new URL(request.url);
    const assignee = url.searchParams.get("assignee");
    const state = url.searchParams.get("state") ?? "open";

    const list = db.issue
      .findMany({ where: { owner: { equals: owner as string }, repo: { equals: repo as string } } })
      .filter((issue) => {
        if (state && issue.state !== state) {
          return false;
        }

        if (assignee === "none") {
          const assignees = (issue.assignees as { login: string }[] | undefined) ?? [];
          return assignees.length === 0;
        }

        if (!assignee) {
          return true;
        }

        const assignees = (issue.assignees as { login: string }[] | undefined) ?? [];
        return assignees.some((item) => item.login === assignee);
      });

    return HttpResponse.json(list);
  }),
  // get issue
  http.get("https://api.github.com/repos/:owner/:repo/issues/:issue_number", ({ params: { owner, repo, issue_number: issueNumber } }) =>
    HttpResponse.json(
      db.issue.findFirst({ where: { owner: { equals: owner as string }, repo: { equals: repo as string }, number: { equals: Number(issueNumber) } } })
    )
  ),
  // get user
  http.get("https://api.github.com/users/:username", ({ params: { username } }) =>
    HttpResponse.json(db.users.findFirst({ where: { login: { equals: username as string } } }))
  ),
  // get repo
  http.get("https://api.github.com/repos/:owner/:repo", ({ params: { owner, repo } }: { params: { owner: string; repo: string } }) => {
    const item = db.repo.findFirst({ where: { name: { equals: repo }, owner: { login: { equals: owner } } } });
    if (!item) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(item);
  }),
  // create issue
  http.post("https://api.github.com/repos/:owner/:repo/issues", () => {
    const id = db.issue.count() + 1;
    const newItem = { ...issueTemplate, id };
    db.issue.create(newItem);
    return HttpResponse.json(newItem);
  }),
  // add assignees
  http.post("https://api.github.com/repos/:owner/:repo/issues/:issue_number/assignees", async ({ params: { owner, repo, issue_number: issueNumber }, request }) => {
    const body = await getValue(request.body);
    const assignees = Array.isArray(body?.assignees) ? body.assignees : [];
    const issue = db.issue.findFirst({
      where: {
        owner: { equals: owner as string },
        repo: { equals: repo as string },
        number: { equals: Number(issueNumber) },
      },
    });

    if (!issue) {
      return new HttpResponse(null, { status: 404 });
    }

    const existing = (issue.assignees as { login: string }[] | undefined) ?? [];
    const next = Array.from(new Set([...existing.map((entry) => entry.login), ...assignees]))
      .map((login) => ({ login }));

    const updated = {
      ...issue,
      assignee: next[0] ?? null,
      assignees: next,
    };

    db.issue.update({
      where: {
        id: {
          equals: issue.id as number,
        },
      },
      data: updated,
    });

    return HttpResponse.json(updated);
  }),
  // remove assignees
  http.delete("https://api.github.com/repos/:owner/:repo/issues/:issue_number/assignees", async ({ params: { owner, repo, issue_number: issueNumber }, request }) => {
    const body = await getValue(request.body);
    const assignees = Array.isArray(body?.assignees) ? body.assignees : [];
    const issue = db.issue.findFirst({
      where: {
        owner: { equals: owner as string },
        repo: { equals: repo as string },
        number: { equals: Number(issueNumber) },
      },
    });

    if (!issue) {
      return new HttpResponse(null, { status: 404 });
    }

    const remaining = ((issue.assignees as { login: string }[] | undefined) ?? []).filter((entry) => !assignees.includes(entry.login));

    const updated = {
      ...issue,
      assignee: remaining[0] ?? null,
      assignees: remaining,
    };

    db.issue.update({
      where: {
        id: {
          equals: issue.id as number,
        },
      },
      data: updated,
    });

    return HttpResponse.json(updated);
  }),
  // create comment
  http.post("https://api.github.com/repos/:owner/:repo/issues/:issue_number/comments", async ({ params: { issue_number: issueNumber }, request }) => {
    const { body } = await getValue(request.body);
    const id = db.issueComments.count() + 1;
    const newItem = { id, body, issue_number: Number(issueNumber), user: db.users.getAll()[0] };
    db.issueComments.create(newItem);
    return HttpResponse.json(newItem);
  }),
  // update comment
  http.patch("https://api.github.com/repos/:owner/:repo/issues/comments/:id", async ({ params: { issue_number: issueNumber }, request }) => {
    const { body } = await getValue(request.body);
    const id = db.issueComments.count();
    const newItem = { id, body, issue_number: Number(issueNumber), user: db.users.getAll()[0] };
    db.issueComments.update({ where: { id: { equals: id } }, data: newItem });
    return HttpResponse.json(newItem);
  }),
];

async function getValue(body: ReadableStream<Uint8Array> | null) {
  if (body) {
    const reader = body.getReader();
    const streamResult = await reader.read();
    if (!streamResult.done) {
      const text = new TextDecoder().decode(streamResult.value);
      try {
        return JSON.parse(text);
      } catch (error) {
        console.error("Failed to parse body as JSON", error);
      }
    }
  }
}
