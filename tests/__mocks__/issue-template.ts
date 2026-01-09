/**
 * This is generic and not fully featured, but it is a good
 * starting point for testing your plugins. Adjust as needed.
 */
const placeholderDate = new Date().toISOString();
const placeholderUrl = "https://example.com";

export default {
  author_association: "NONE",
  closed_at: null,
  comments: 0,
  comments_url: `${placeholderUrl}/comments`,
  created_at: placeholderDate,
  events_url: `${placeholderUrl}/events`,
  html_url: "https://github.com/ubiquity/test-repo/issues/1",
  id: 1,
  labels_url: `${placeholderUrl}/labels`,
  locked: false,
  milestone: null,
  node_id: "1",
  owner: "ubiquity",
  number: 1,
  repository_url: "https://github.com/ubiquity/test-repo",
  state: "open",
  title: "issue",
  updated_at: placeholderDate,
  url: `${placeholderUrl}/issues/1`,
  user: null,
  repo: "test-repo",
  assignees: [],
  labels: [
    {
      name: "Price: 25 USD",
    },
    {
      name: "Time: <1 Hour",
    },
    {
      name: "Priority: 1 (Normal)",
    },
  ],
  body: "body",
  assignee: null,
};
