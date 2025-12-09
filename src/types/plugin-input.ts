import { StaticDecode, Type as T } from "@sinclair/typebox";

export const pluginSettingsSchema = T.Object(
  {
    organizations: T.Array(T.String(), {
      default: ["ubiquity", "ubiquity-os", "ubiquity-os-marketplace"],
      minItems: 1,
    }),
    dailyCapacityHours: T.Number({ default: 6, minimum: 1 }),
    planningHorizonDays: T.Number({ default: 5, minimum: 1 }),
    reviewBufferHours: T.Number({ default: 2, minimum: 0 }),
    defaultEstimateHours: T.Number({ default: 4, minimum: 1 }),
  },
  { default: {} }
);

export type PluginSettings = StaticDecode<typeof pluginSettingsSchema>;
