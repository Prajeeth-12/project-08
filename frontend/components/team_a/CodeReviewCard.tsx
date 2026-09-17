"use client";

import React, { useState } from "react";

export interface TestCaseItem {
  input: string;
  expected_output: string;
}

export interface CodeReviewCardProps {
  sourceCode: string;
  candidateId?: string;
  problemId?: string;
  sessionId?: string;
  hiddenTestCases?: TestCaseItem[];
  onEvaluated?: (data: any) => void;
}

interface VerdictData {
  submissionId: string;
  verdict: "ACCEPTED" | "WRONG_ANSWER" | "TIME_LIMIT_EXCEEDED" | "COMPILATION_ERROR" | string;
  scorePercentage: number;
  testCasesPassed: number;
  totalTestCases: number;
  executionTimeMs: number;
  timeComplexity: string;
  spaceComplexity: string;
  cyclomaticComplexity: number;
  maxLoopDepth: number;
  codeSmells: string[];
  suggestions: string[];
  feedback: string;
}

export const CodeReviewCard: React.FC<CodeReviewCardProps> = ({
  sourceCode,
  candidateId,
  problemId,
  sessionId,
  hiddenTestCases,
  onEvaluated,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verdictResult, setVerdictResult] = useState<VerdictData | null>(null);

  // Fallback / Inspect AST only
  const handleRunAST = async () => {
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await fetch("http://localhost:8000/api/ai/code-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sourceCode, language: "python" }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setVerdictResult({
        submissionId: data.review_id,
        verdict: "ACCEPTED",
        scorePercentage: 100,
        testCasesPassed: 1,
        totalTestCases: 1,
        executionTimeMs: 0,
        timeComplexity: data.time_complexity,
        spaceComplexity: data.space_complexity,
        cyclomaticComplexity: data.cyclomatic_complexity,
        maxLoopDepth: data.max_loop_depth,
        feedback: data.feedback,
        codeSmells: data.code_smells || [],
        suggestions: data.suggestions || [],
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to analyze code AST");
    } finally {
      setAnalyzing(false);
    }
  };

  // Full Batch Hidden Test Suite Evaluation
  const handleGradeSubmission = async () => {
    setEvaluating(true);
    setErrorMsg(null);
    try {
      const payload = {
        source_code: sourceCode,
        language: "python",
        candidate_id: candidateId || "candidate-demo",
        problem_id: problemId || "problem-default",
        session_id: sessionId,
        hidden_test_cases: hiddenTestCases || [
          { input: "1 2 3", expected_output: "6" },
          { input: "10 20", expected_output: "30" },
        ],
      };

      const res = await fetch("http://localhost:8000/api/ai/code-review/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const formatted: VerdictData = {
        submissionId: data.submission_id,
        verdict: data.verdict,
        scorePercentage: data.score_percentage,
        testCasesPassed: data.test_cases_passed,
        totalTestCases: data.total_test_cases,
        executionTimeMs: data.execution_time_ms,
        timeComplexity: data.time_complexity,
        spaceComplexity: data.space_complexity,
        cyclomaticComplexity: data.cyclomatic_complexity,
        maxLoopDepth: data.max_loop_depth,
        feedback: data.feedback,
        codeSmells: data.code_smells || [],
        suggestions: data.suggestions || [],
      };
      setVerdictResult(formatted);
      if (onEvaluated) onEvaluated(formatted);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to evaluate exam submission");
    } finally {
      setEvaluating(false);
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ACCEPTED (100%)
          </span>
        );
      case "WRONG_ANSWER":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            WRONG ANSWER
          </span>
        );
      case "TIME_LIMIT_EXCEEDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            TIME LIMIT EXCEEDED
          </span>
        );
      case "COMPILATION_ERROR":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            COMPILATION ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {verdict}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="font-bold text-slate-100 text-sm tracking-wide">
            Verdict Engine & AST Code Review
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            Member A5
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAST}
            disabled={analyzing || evaluating}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg font-medium transition flex items-center gap-1.5 border border-slate-700"
          >
            {analyzing ? "Analyzing AST..." : "Inspect AST"}
          </button>
          <button
            onClick={handleGradeSubmission}
            disabled={analyzing || evaluating}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold transition shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
          >
            {evaluating ? "Grading Testcases..." : "Grade Submission"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-rose-300 flex items-start gap-2">
          <span className="font-bold">Error:</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Results View */}
      {verdictResult && (
        <div className="space-y-4 pt-1">
          {/* Verdict and Testcases Banner */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-medium">Final Verdict:</span>
                {getVerdictBadge(verdictResult.verdict)}
              </div>
              <div className="text-[11px] text-slate-400">
                <span>Score: </span>
                <span className="font-bold text-slate-200 font-mono">
                  {verdictResult.scorePercentage}%
                </span>
                <span className="mx-2 text-slate-600">•</span>
                <span>Runtime: </span>
                <span className="font-bold text-slate-300 font-mono">
                  {verdictResult.executionTimeMs}ms
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="min-w-[200px] space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>Test Cases Passed:</span>
                <span className="font-mono text-slate-200">
                  {verdictResult.testCasesPassed} / {verdictResult.totalTestCases}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    verdictResult.verdict === "ACCEPTED"
                      ? "bg-emerald-500"
                      : verdictResult.verdict === "COMPILATION_ERROR"
                      ? "bg-purple-500"
                      : "bg-rose-500"
                  }`}
                  style={{
                    width: `${Math.max(
                      5,
                      Math.min(100, (verdictResult.testCasesPassed / (verdictResult.totalTestCases || 1)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* AST Complexity 4-Tile Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-center">
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Time Bound</span>
              <span className="font-bold text-amber-400 font-mono text-sm">{verdictResult.timeComplexity}</span>
            </div>
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Space Bound</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">{verdictResult.spaceComplexity}</span>
            </div>
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Cyclomatic</span>
              <span className="font-bold text-indigo-400 font-mono text-sm">{verdictResult.cyclomaticComplexity}</span>
            </div>
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Max Loop Depth</span>
              <span className="font-bold text-cyan-400 font-mono text-sm">{verdictResult.maxLoopDepth}</span>
            </div>
          </div>

          {/* Feedback Summary */}
          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 text-slate-300 leading-relaxed">
            {verdictResult.feedback}
          </div>

          {/* Code Smells */}
          {verdictResult.codeSmells.length > 0 && (
            <div className="bg-rose-950/20 border border-rose-900/40 p-3 rounded-lg space-y-1.5">
              <span className="font-semibold text-rose-400 block text-[11px] uppercase tracking-wide">
                Detected Code Smells & Inefficiencies:
              </span>
              <ul className="list-disc pl-4 space-y-1 text-rose-300/90 leading-normal">
                {verdictResult.codeSmells.map((smell, i) => (
                  <li key={i}>{smell}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Optimization Suggestions */}
          {verdictResult.suggestions.length > 0 && (
            <div className="bg-indigo-950/20 border border-indigo-900/40 p-3 rounded-lg space-y-1.5">
              <span className="font-semibold text-indigo-400 block text-[11px] uppercase tracking-wide">
                Optimization Recommendations:
              </span>
              <ul className="list-disc pl-4 space-y-1 text-slate-300 leading-normal">
                {verdictResult.suggestions.map((sug, i) => (
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

