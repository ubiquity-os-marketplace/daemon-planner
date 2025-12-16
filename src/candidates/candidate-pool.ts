import { getStartStatus } from "../start-stop/get-start-status";
import { Context } from "../types/context";

type UserOrgMap = Map<string, string[]>;

type CandidatePoolContext = Omit<Context, "candidates" | "tasks">;

export type CandidateStatus = {
  login: string;
  isAvailable: boolean;
  assignedIssueUrls: string[];
};

export class CandidatePool {
  private readonly _context: CandidatePoolContext;
  private readonly _orgCache = new Map<string, Promise<string[]>>();
  private _orgMembers: Promise<UserOrgMap> | null = null;
  private readonly _availability = new Map<string, Promise<boolean>>();
  private readonly _startStatus = new Map<string, Promise<Awaited<ReturnType<typeof getStartStatus>>>>();

  constructor(context: CandidatePoolContext) {
    this._context = context;
  }

  getOrganizationCollaborators(org: string): Promise<string[]> {
    const trimmed = org.trim();

    if (!trimmed) {
      return Promise.resolve([]);
    }

    const cached = this._orgCache.get(trimmed);
    if (cached) {
      return cached;
    }

    const pending = this._context.adapters.getOrganizationCollaborators(trimmed).then((collaborators) => Array.from(new Set(collaborators)));

    this._orgCache.set(trimmed, pending);

    return pending;
  }

  async getUsersByOrganization(): Promise<UserOrgMap> {
    if (this._orgMembers) {
      return this._orgMembers;
    }

    this._orgMembers = (async () => {
      const map: UserOrgMap = new Map();
      for (const org of this._context.config.organizations) {
        const key = org.trim();
        if (!key) {
          continue;
        }

        const members = await this.getOrganizationCollaborators(key);
        map.set(key, members);
      }

      return map;
    })();

    return this._orgMembers;
  }

  async isMemberOfOrg(login: string, org: string): Promise<boolean> {
    const usersByOrg = await this.getUsersByOrganization();
    const key = org.trim();
    const members = usersByOrg.get(key) ?? [];
    return members.includes(login);
  }

  private _getStartStatus(login: string, issueUrl: string): Promise<Awaited<ReturnType<typeof getStartStatus>>> {
    const normalized = login.trim();
    if (!normalized) {
      return Promise.resolve(null);
    }

    const cached = this._startStatus.get(normalized);
    if (cached) {
      return cached;
    }

    const pending = getStartStatus(this._context, normalized, issueUrl);
    this._startStatus.set(normalized, pending);
    return pending;
  }

  private _isGloballyAvailable(login: string, issueUrl: string): Promise<boolean> {
    const normalized = login.trim();
    if (!normalized) {
      return Promise.resolve(false);
    }

    const cached = this._availability.get(normalized);
    if (cached) {
      return cached;
    }

    const pending = this._getStartStatus(normalized, issueUrl).then((payload) => payload?.computed.assignedIssues.length === 0);

    this._availability.set(normalized, pending);
    return pending;
  }

  async getAvailableCandidates(org: string, issueUrl: string): Promise<string[]> {
    const byOrg = await this.getUsersByOrganization();
    const members = byOrg.get(org.trim()) ?? [];
    const allowed = await Promise.all(members.map(async (login) => ((await this._isGloballyAvailable(login, issueUrl)) ? login : null)));
    return allowed.filter((login): login is string => Boolean(login));
  }

  async getAllCandidateStatuses(issueUrl: string): Promise<CandidateStatus[]> {
    const byOrg = await this.getUsersByOrganization();
    const users = new Set<string>();
    for (const list of byOrg.values()) {
      for (const login of list) {
        const normalized = login.trim();
        if (normalized) {
          users.add(normalized);
        }
      }
    }

    const statuses = await Promise.all(
      [...users].map(async (login) => {
        const payload = await this._getStartStatus(login, issueUrl);
        const assignedIssueUrls = (payload?.computed.assignedIssues ?? []).map((ref) => ref.html_url).filter((url): url is string => Boolean(url));
        return {
          login,
          isAvailable: assignedIssueUrls.length === 0,
          assignedIssueUrls,
        } satisfies CandidateStatus;
      })
    );

    return statuses.sort((a, b) => a.login.localeCompare(b.login));
  }

  async getAllAvailableLogins(issueUrl: string): Promise<string[]> {
    const statuses = await this.getAllCandidateStatuses(issueUrl);
    return statuses.filter((entry) => entry.isAvailable).map((entry) => entry.login);
  }
}
