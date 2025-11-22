import { Env } from "../types/index";

type Logger = {
  error(message: string, meta?: unknown): void;
};

function normaliseLogin(entry: unknown): string | null {
  if (typeof entry === "string") {
    return entry;
  }

  if (entry && typeof entry === "object") {
    const login = (entry as { login?: unknown }).login;

    if (typeof login === "string") {
      return login;
    }
  }

  return null;
}

export async function fetchSupabaseCandidates(env: Env, logger: Logger): Promise<string[]> {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_KEY;

  if (!url || !key) {
    return [];
  }

  const table = env.SUPABASE_CANDIDATES_TABLE ?? "candidates";
  const endpoint = `${url.replace(/\/$/, String())}/rest/v1/${table}?select=login`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        Prefer: "return=representation",
      },
    });

    if (!response.ok) {
      logger.error(`Failed to fetch candidates from Supabase (${response.status})`);
      return [];
    }

    const payload = await response.json();
    const list = Array.isArray(payload) ? payload : [];

    return list.map(normaliseLogin).filter((login): login is string => Boolean(login));
  } catch (error) {
    logger.error("Failed to fetch candidates from Supabase", { error });
    return [];
  }
}
