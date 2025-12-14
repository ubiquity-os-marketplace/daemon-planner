import { Logs } from "@ubiquity-os/ubiquity-os-logger";
import { listAssignedIssues } from "../github/list-assigned-issues";
import { Context, PluginAdapters } from "../types/index";

type UserOrgMap = Map<string, string[]>;

type OctokitLike = {
  rest: {
    apps: { listReposAccessibleToInstallation: unknown };
    issues: { listForRepo: unknown };
  };
  paginate: <T>(method: unknown, params: Record<string, unknown>) => Promise<T[]>;
};

type CollaboratorPoolContext = {
  adapters: PluginAdapters;
  octokit: OctokitLike;
  logger: Logs;
  config: Context["config"];
};

export class CollaboratorPool {
  private readonly _context: CollaboratorPoolContext;
  private readonly _orgCache = new Map<string, Promise<string[]>>();
  private _orgMembers: Promise<UserOrgMap> | null = null;
  private _availableByOrg: Promise<UserOrgMap> | null = null;
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

  private _isGloballyAvailable(login: string): Promise<boolean> {
    const normalized = login.trim();
    if (!normalized) {
      return Promise.resolve(false);
    }

    const cached = this._availability.get(normalized);
    if (cached) {
      return cached;
    }

    const pending = listAssignedIssues(this._context.octokit, this._context.logger, this._context.config.organizations, normalized).then(
      (issues) => issues.length === 0
    );

    this._availability.set(normalized, pending);
    return pending;
  }

  async getAvailableUsersByOrganization(): Promise<UserOrgMap> {
    if (this._availableByOrg) {
      return this._availableByOrg;
    }

    this._availableByOrg = (async () => {
      const usersByOrg = await this.getUsersByOrganization();
      const result: UserOrgMap = new Map();

      const uniqueUsers = new Set<string>();
      for (const members of usersByOrg.values()) {
        for (const login of members) {
          uniqueUsers.add(login);
        }
      }

      const availability = new Map<string, boolean>();
      await Promise.all(
        [...uniqueUsers].map(async (login) => {
          availability.set(login, await this._isGloballyAvailable(login));
        })
      );

      for (const [org, members] of usersByOrg.entries()) {
        result.set(
          org,
          members.filter((login) => availability.get(login) === true)
        );
      }

      return result;
    })();

    return this._availableByOrg;
  }

  async getAvailableCollaborators(org: string): Promise<string[]> {
    const byOrg = await this.getAvailableUsersByOrganization();
    return byOrg.get(org.trim()) ?? [];
  }

  async getAllAvailableLogins(): Promise<string[]> {
    const byOrg = await this.getAvailableUsersByOrganization();
    const users = new Set<string>();
    for (const list of byOrg.values()) {
      for (const login of list) {
        users.add(login);
      }
    }

    return [...users].sort((a, b) => a.localeCompare(b));
  }
}
