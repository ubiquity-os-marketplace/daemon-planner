import type { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import type { BaseContext } from "../types/context";
import { getOrgAuthenticatedOctokit } from "./get-org-authenticated-octokit";

type OrgOctokit = InstanceType<typeof customOctokit>;

type OrgOctokitPoolContext = Pick<BaseContext, "octokit" | "logger" | "env">;

export class OrgOctokitPool {
  private readonly _context: OrgOctokitPoolContext;
  private readonly _cache = new Map<string, Promise<OrgOctokit>>();

  constructor(context: OrgOctokitPoolContext) {
    this._context = context;
  }

  get(org: string): Promise<OrgOctokit> {
    const key = org.trim();
    if (!key) {
      return Promise.resolve(this._context.octokit as unknown as OrgOctokit);
    }

    const cached = this._cache.get(key);
    if (cached) {
      return cached;
    }

    const pending = getOrgAuthenticatedOctokit(this._context, key);
    this._cache.set(key, pending);
    return pending;
  }
}
