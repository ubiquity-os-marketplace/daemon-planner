import { StaticDecode, Type as T } from "@sinclair/typebox";
import { LOG_LEVEL } from "@ubiquity-os/ubiquity-os-logger";
import "dotenv/config";

/**
 * Define sensitive environment variables here.
 *
 * These are fed into the worker/workflow as `env` and are
 * taken from either `dev.vars` or repository secrets.
 * They are used with `process.env` but are type-safe.
 */
export const envSchema = T.Object({
  LOG_LEVEL: T.Optional(T.Enum(LOG_LEVEL, { default: LOG_LEVEL.INFO })),
  KERNEL_PUBLIC_KEY: T.Optional(T.String()),
  MATCHMAKING_ENDPOINT: T.String({ format: "uri", default: "https://command-start-stop.ubq.fi" }),
  COMMAND_ENDPOINT: T.Optional(T.String()),
  SUPABASE_URL: T.Optional(T.String({ format: "uri" })),
  SUPABASE_KEY: T.Optional(T.String()),
  SUPABASE_CANDIDATES_TABLE: T.Optional(T.String({ default: "candidates" })),
  APP_ID: T.String({ minLength: 1 }),
  APP_PRIVATE_KEY: T.String({ minLength: 1 }),
});

export type Env = StaticDecode<typeof envSchema>;
