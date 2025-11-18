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
    ],
    assignees: [],
    updated_at: new Date().toISOString(),
  });
}
