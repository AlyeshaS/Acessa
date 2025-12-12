export type AnalysisStep =
  | { type: "click"; x: number; y: number; label?: string }
  | {
      type: "highlight";
      x: number;
      y: number;
      width: number;
      height: number;
      issue: string;
    }
  | { type: "issue"; issueId: string; summary: string; wcag: string };

export interface AnalysisResult {
  screenshot: string; // data URL from backend
  steps: AnalysisStep[];
}
