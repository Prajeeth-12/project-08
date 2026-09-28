"use client";

import React from "react";

interface ProbingStatusProps {
  difficulty?: "SURFACE" | "INTERMEDIATE" | "DEEP";
  decision?: string;
  confidenceScore?: number;
  reasoningSnippet?: string;
}

export const ProbingStatus: React.FC<ProbingStatusProps> = ({
  difficulty = "INTERMEDIATE",
  decision = "PROBE_DEEPER",
  confidenceScore = 0.88,
  reasoningSnippet = "Assessing candidate depth on distributed locking and indexing tradeoffs.",
}) => {
  const getDifficultyBadge = () => {
    switch (difficulty) {
      case "DEEP":
        return "bg-purple-950 text-purple-300 border-purple-700";
      case "INTERMEDIATE":
        return "bg-blue-950 text-blue-300 border-blue-700";
      case "SURFACE":
      default:
        return "bg-amber-950 text-amber-300 border-amber-700";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-xs space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-200 uppercase tracking-wider">Dynamic Probing Loop</span>
        <span className={`px-2 py-0.5 rounded border font-semibold ${getDifficultyBadge()}`}>
          {difficulty} DEPTH
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-slate-400">
          <span>Agent Loop State:</span>
          <span className="text-slate-200 font-mono font-bold">{decision}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Confidence Score:</span>
          <span className="text-emerald-400 font-mono">{(confidenceScore * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-slate-300 italic">
        "{reasoningSnippet}"
      </div>
    </div>
  );
};
