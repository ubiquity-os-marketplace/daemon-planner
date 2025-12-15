import { Context } from "../../types/context";

export type PlannerContext = Pick<Context, "config" | "octokit" | "logger" | "env" | "collaborators" | "runSummary">;

export interface RepositoryRef {
  owner: string;
  name: string;
}

export interface PlannerUser {
  login?: string | null;
}

export interface PlannerLabel {
  name?: string | null;
}

export interface PlannerIssue {
  number: number;
  labels?: Array<PlannerLabel | string | null> | null;
  assignees?: (PlannerUser | null)[] | null;
  assignee?: PlannerUser | null;
  updated_at?: string | null;
}

export interface CandidateScore {
  login: string;
  load: number;
}
