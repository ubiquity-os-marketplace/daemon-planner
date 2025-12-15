import { getStartStatus } from "../start-stop/get-start-status";
import { Context } from "../types/context";

type UserOrgMap = Map<string, string[]>;

type CollaboratorPoolContext = Omit<Context, "collaborators" | "tasks">;

export class CollaboratorPool {
  private readonly _context: CollaboratorPoolContext;
  private readonly _orgCache = new Map<string, Promise<string[]>>();
  private _orgMembers: Promise<UserOrgMap> | null = null;
  private readonly _availability = new Map<string, Promise<boolean>>();

  constructor(context: CollaboratorPoolContext) {
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

  private _isGloballyAvailable(login: string, issueUrl: string): Promise<boolean> {
    const normalized = login.trim();
    if (!normalized) {
      return Promise.resolve(false);
    }

    const cached = this._availability.get(normalized);
    if (cached) {
      return cached;
    }

    const pending = getStartStatus(this._context, normalized, issueUrl).then((payload) => payload?.computed.assignedIssues.length === 0);

    this._availability.set(normalized, pending);
    return pending;
  }

  async getAvailableCollaborators(org: string, issueUrl: string): Promise<string[]> {
    const byOrg = await this.getUsersByOrganization();
    const members = byOrg.get(org.trim()) ?? [];
    const allowed = await Promise.all(members.map(async (login) => ((await this._isGloballyAvailable(login, issueUrl)) ? login : null)));
    return allowed.filter((login): login is string => Boolean(login));
  }

  async getAllAvailableLogins(issueUrl: string): Promise<string[]> {
    const byOrg = await this.getUsersByOrganization();
    const users = new Set<string>();
    for (const list of byOrg.values()) {
      for (const login of list) {
        users.add(login);
      }
    }

    const allowed = await Promise.all([...users].map(async (login) => ((await this._isGloballyAvailable(login, issueUrl)) ? login : null)));

    return allowed.filter((login): login is string => Boolean(login)).sort((a, b) => a.localeCompare(b));
  }
}
