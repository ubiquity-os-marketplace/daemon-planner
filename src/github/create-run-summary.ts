export type RunSummaryTask = {
  owner: string;
  repo: string;
  issueNumber: number;
};

export type RunSummary = {
  dryRun: boolean;
  actions: string[];
  consideredTasks: RunSummaryTask[];
  availableCandidates: string[];
  assignmentsByCandidate: Record<string, RunSummaryTask[]>;
  addAction(action: string): void;
  setConsideredTasks(tasks: RunSummaryTask[]): void;
  setAvailableCandidates(candidates: string[]): void;
  addAssignedTask(login: string, task: RunSummaryTask): void;
};

export function createRunSummary(dryRun: boolean): RunSummary {
  const actions: string[] = [];
  const consideredTasks: RunSummaryTask[] = [];
  const availableCandidates: string[] = [];
  const assignmentsByCandidate: Record<string, RunSummaryTask[]> = {};

  return {
    dryRun,
    actions,
    consideredTasks,
    availableCandidates,
    assignmentsByCandidate,
    addAction(action: string) {
      actions.push(action);
    },
    setConsideredTasks(tasks: RunSummaryTask[]) {
      consideredTasks.length = 0;
      consideredTasks.push(...tasks);
    },
    setAvailableCandidates(candidates: string[]) {
      availableCandidates.length = 0;
      availableCandidates.push(...candidates);
    },
    addAssignedTask(login: string, task: RunSummaryTask) {
      const key = login.trim();
      if (!key) {
        return;
      }

      const existing = assignmentsByCandidate[key];
      if (existing) {
        existing.push(task);
        return;
      }

      assignmentsByCandidate[key] = [task];
    },
  };
}
