import { createContext } from "react";

/** One shared source for "Step x of N" so every screen in the check-in flow agrees. */
export interface CheckinStepInfo {
  /** Zero-based index of the current step, or -1 when no step applies (landing, done, error) */
  index: number;
  labels: string[];
}

export const CheckinStepContext = createContext<CheckinStepInfo>({ index: -1, labels: [] });

export function buildStepLabels(allowsCompanions: boolean): string[] {
  return ["Sign in", "Verify ID", ...(allowsCompanions ? ["Companions"] : []), "Confirm"];
}
