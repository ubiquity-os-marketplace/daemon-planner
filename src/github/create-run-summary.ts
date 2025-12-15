export type RunSummary = {
  dryRun: boolean;
  actions: string[];
  addAction(action: string): void;
};

export function createRunSummary(dryRun: boolean): RunSummary {
  const actions: string[] = [];

  return {
    dryRun,
    actions,
    addAction(action: string) {
      actions.push(action);
    },
  };
}
