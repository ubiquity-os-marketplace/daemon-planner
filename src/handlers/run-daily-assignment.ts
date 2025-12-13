import { Context } from "../types/index";
import { planAssignment } from "./planner/plan-assignment";

export async function runDailyAssignment(context: Context) {
  const tasks = await context.tasks.getSortedAvailableTasks();

  for (const task of tasks) {
    await planAssignment(context, task.repository, task.issue);
  }
}
