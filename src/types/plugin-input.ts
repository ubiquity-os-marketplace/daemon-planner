import { StaticDecode, Type as T } from "@sinclair/typebox";

export const pluginSettingsSchema = T.Object(
  {
    organizations: T.Array(T.String(), {
      default: ["ubiquity", "ubiquity-os", "ubiquity-os-marketplace"],
      minItems: 1,
      description: "List of GitHub organizations to process issues for.",
    }),
    assignedTaskLimit: T.Number({ default: 1, minimum: 1, description: "Maximum number of tasks that a user can be assigned to." }),
    recommendationThreshold: T.Number({
      default: 20,
      minimum: 0,
      maximum: 100,
      description: "Minimum matchmaking relevance score required for a user to be considered for assignment.",
    }),
    dryRun: T.Boolean({
      default: false,
      description: "When enabled, planned actions are logged but no assignments are executed.",
    }),
  },
  { default: {} }
);

export type PluginSettings = StaticDecode<typeof pluginSettingsSchema>;
