export type RunSummaryTask = {
  owner: string;
  repo: string;
  issueNumber: number;
};

export type RunSummaryCandidate = {
  login: string;
  isAvailable: boolean;
  assignedIssueUrls: string[];
  dryRunPlans?: string[];
};

export type RunSummary = {
  dryRun: boolean;
  actions: string[];
  consideredTasks: RunSummaryTask[];
  candidates: RunSummaryCandidate[];
  addAction(action: string): void;
  addCandidateDryRunPlan(login: string, message: string): void;
  setConsideredTasks(tasks: RunSummaryTask[]): void;
  setCandidates(candidates: RunSummaryCandidate[]): void;
};

export function createRunSummary(dryRun: boolean): RunSummary {
  const actions: string[] = [];
  const consideredTasks: RunSummaryTask[] = [];
  const candidates: RunSummaryCandidate[] = [];

  return {
    dryRun,
    actions,
    consideredTasks,
    candidates,
    addAction(action: string) {
      actions.push(action);
    },
    addCandidateDryRunPlan(login: string, message: string) {
      const normalized = login.trim();
      if (!normalized) {
        return;
      }

      let candidate = candidates.find((entry) => entry.login === normalized);
      if (!candidate) {
        candidate = { login: normalized, isAvailable: false, assignedIssueUrls: [], dryRunPlans: [] };
        candidates.push(candidate);
      }

      if (!candidate.dryRunPlans) {
        candidate.dryRunPlans = [];
      }

      candidate.dryRunPlans.push(message);
    },
    setConsideredTasks(tasks: RunSummaryTask[]) {
      consideredTasks.length = 0;
      consideredTasks.push(...tasks);
    },
    setCandidates(next: RunSummaryCandidate[]) {
      candidates.length = 0;
      candidates.push(...next);
    },
  };
}
