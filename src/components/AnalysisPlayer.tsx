import React, { useEffect, useState } from "react";
import type { AnalysisResult, AnalysisStep } from "../types/analysis";

interface AnalysisPlayerProps {
  result: AnalysisResult;
  onComplete?: () => void; // callback when animation finishes
}

export const AnalysisPlayer: React.FC<AnalysisPlayerProps> = ({
  result,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const steps = result.steps || [];

  useEffect(() => {
    if (!steps.length) return;

    setCurrentIndex(0);

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= steps.length) {
          clearInterval(interval);
          if (onComplete) onComplete();
          return prev;
        }
        return next;
      });
    }, 1400); // change every 1.4s – tweak for vibe

    return () => clearInterval(interval);
  }, [steps, onComplete]);

  const currentStep: AnalysisStep | undefined = steps[currentIndex];

  return (
    <div className="grid grid-cols-[2fr_1fr] gap-4 items-start">
      {/* LEFT: Screenshot + overlays */}
      <div className="relative w-full border border-slate-800 rounded-xl overflow-hidden bg-black/40">
        <img
          src={result.screenshot}
          alt="Analyzed page preview"
          className="w-full h-auto block"
        />

        {/* Click circle */}
        {currentStep?.type === "click" && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: currentStep.x - 16,
              top: currentStep.y - 16,
              width: 32,
              height: 32,
              borderRadius: "9999px",
              border: "3px solid #E6892C",
              boxShadow: "0 0 16px rgba(230,137,44,0.7)",
              transition: "all 0.25s ease-out",
            }}
          />
        )}

        {/* Highlight box */}
        {currentStep?.type === "highlight" && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: currentStep.x,
              top: currentStep.y,
              width: currentStep.width,
              height: currentStep.height,
              borderRadius: "10px",
              border: "3px solid #7c8da0",
              boxShadow: "0 0 0 4px rgba(124,138,160,0.3)",
              background: "rgba(124,138,160,0.08)",
              transition: "all 0.25s ease-out",
            }}
          />
        )}
      </div>

      {/* RIGHT: Step text */}
      <div className="space-y-3 text-sm">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Analyzing your page… Step {Math.min(currentIndex + 1, steps.length)}{" "}
          of {steps.length}
        </p>

        {currentStep?.type === "click" && (
          <div>
            <h3 className="font-semibold text-slate-50 mb-1">
              Simulating user interaction
            </h3>
            <p className="text-slate-300">
              {currentStep.label ||
                "Checking how interactive elements behave for users."}
            </p>
          </div>
        )}

        {currentStep?.type === "highlight" && (
          <div>
            <h3 className="font-semibold text-slate-50 mb-1">
              Focusing on a potential issue
            </h3>
            <p className="text-slate-300">{currentStep.issue}</p>
          </div>
        )}

        {currentStep?.type === "issue" && (
          <div className="border border-slate-700 rounded-lg p-3 bg-slate-900/40">
            <h3 className="font-semibold text-slate-50 mb-1">
              {currentStep.summary}
            </h3>
            <p className="text-xs text-slate-400 mt-1">{currentStep.wcag}</p>
          </div>
        )}

        {!currentStep && (
          <p className="text-slate-400">Preparing accessibility insights…</p>
        )}
      </div>
    </div>
  );
};
