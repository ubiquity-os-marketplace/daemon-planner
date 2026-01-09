import { db } from "./db";
import issueTemplate from "./issue-template";
import { STRINGS } from "./strings";
import usersGet from "./users-get.json";

export async function setupTests() {
  for (const item of usersGet) {
    db.users.create(item);
  }

  db.repo.create({
    id: 1,
    html_url: String(),
    name: STRINGS.TEST_REPO,
    owner: {
      login: STRINGS.USER_1,
      id: 1,
    },
    issues: [],
    archived: false,
    private: false,
    labels: [],
  });

  db.repo.create({
    id: 2,
    html_url: String(),
    name: STRINGS.TEST_REPO,
    owner: {
      login: "ubiquity-os",
      id: 2,
    },
    issues: [],
    archived: false,
    private: false,
    labels: [],
  });

  db.issue.create({
    ...issueTemplate,
    updated_at: new Date().toISOString(),
  });

  db.issue.create({
    ...issueTemplate,
    id: 2,
    number: 2,
    labels: [
      {
        name: "Time: <4 Hours",
      },
      {
        name: "Priority: 1 (Normal)",
      },
    ],
    assignees: [],
    updated_at: new Date().toISOString(),
  });

  db.issue.create({
    ...issueTemplate,
    id: 3,
    number: 3,
    owner: "ubiquity-os",
    assignees: [
      {
        login: "user1",
      },
    ],
    assignee: {
      login: "user1",
    },
    labels: [
      {
        name: "Time: 1 Day",
      },
    ],
    updated_at: new Date().toISOString(),
  });
}
