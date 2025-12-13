import { PluginAdapters } from "../types/index";

export class CollaboratorPool {
  private readonly _adapters: PluginAdapters;
  private readonly _cache = new Map<string, Promise<string[]>>();

  constructor(adapters: PluginAdapters) {
    this._adapters = adapters;
  }

  getAvailableCollaborators(org: string): Promise<string[]> {
    const trimmed = org.trim();

    if (!trimmed) {
      return Promise.resolve([]);
    }

    const cached = this._cache.get(trimmed);
    if (cached) {
      return cached;
    }

    const pending = this._adapters.getOrganizationCollaborators(trimmed).then((collaborators) => Array.from(new Set(collaborators)));

    this._cache.set(trimmed, pending);

    return pending;
  }
}
