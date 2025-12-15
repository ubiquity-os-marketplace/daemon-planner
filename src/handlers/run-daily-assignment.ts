import { Context } from "../types/context";
import { planAssignment } from "./planner/plan-assignment";

export async function runDailyAssignment(context: Context): Promise<void> {
  await planAssignment(context);
}
