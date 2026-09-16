"use client";

import React, { useState } from "react";

interface CodeReviewCardProps {
  sourceCode: string;
}

export const CodeReviewCard: React.FC<CodeReviewCardProps> = ({ sourceCode }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [review, setReview] = useState<{
    timeComplexity: string;
    spaceComplexity: string;
    cyclomaticComplexity: number;
    feedback: string;
    codeSmells: string[];
    suggestions: string[];
  } | null>(null);

  const handleRunAST = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("http://localhost:8000/api/ai/code-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sourceCode, language: "python" }),
      });
      const data = await res.json();
      setReview({
        timeComplexity: data.time_complexity,
        spaceComplexity: data.space_complexity,
        cyclomaticComplexity: data.cyclomatic_complexity,
        feedback: data.feedback,
        codeSmells: data.code_smells,
        suggestions: data.suggestions,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-xs space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-200">AST Review & Big-O Analyzer</span>
        <button
          onClick={handleRunAST}
          disabled={analyzing}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded font-medium transition"
        >
          {analyzing ? "Analyzing AST..." : "Inspect Complexity"}
        </button>
      </div>

      {review && (
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-slate-950 rounded border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Time</span>
              <span className="font-bold text-amber-400 font-mono">{review.timeComplexity}</span>
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Space</span>
              <span className="font-bold text-emerald-400 font-mono">{review.spaceComplexity}</span>
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Cyclomatic</span>
              <span className="font-bold text-indigo-400 font-mono">{review.cyclomaticComplexity}</span>
            </div>
          </div>

          <p className="text-slate-300 leading-relaxed">{review.feedback}</p>

          {review.codeSmells.length > 0 && (
            <div>
              <span className="font-semibold text-rose-400 block mb-1">Code Smells:</span>
              <ul className="list-disc pl-4 space-y-1 text-rose-300">
                {review.codeSmells.map((smell, i) => (
                  <li key={i}>{smell}</li>
                ))}
              </ul>
            </div>
          )}

          {review.suggestions.length > 0 && (
            <div>
              <span className="font-semibold text-indigo-400 block mb-1">Suggestions:</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                {review.suggestions.map((sug, i) => (
                  <li key={i}>{sug}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
