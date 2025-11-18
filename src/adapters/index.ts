import { BaseContext, PluginAdapters } from "../types";
import { fetchSupabaseCandidates } from "./candidates";

export function createAdapters(context: BaseContext): PluginAdapters {
  return {
    getAllCandidates: () => fetchSupabaseCandidates(context.env, context.logger),
  };
}
