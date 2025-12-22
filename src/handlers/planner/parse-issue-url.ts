export function parseIssueUrl(url: string): { owner: string; repo: string; issue_number: number } | null {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)$/.exec(url);
  if (!match) {
    return null;
  }

  return { owner: match[1], repo: match[2], issue_number: Number(match[3]) };
}
