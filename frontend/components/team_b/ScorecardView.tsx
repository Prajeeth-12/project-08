"use client";

import React from "react";

interface EvaluationData {
  overallScore: number;
  correctness: number;
  complexity: number;
  systemDesign: number;
  communication: number;
  veracity: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  roadmap: Array<{ week: number; focus: string; tasks: string[] }>;
}

interface ScorecardViewProps {
  data?: EvaluationData;
}

const defaultData: EvaluationData = {
  overallScore: 84.5,
  correctness: 8.5,
  complexity: 8.0,
  systemDesign: 9.0,
  communication: 8.0,
  veracity: 9.0,
  summary:
    "Candidate demonstrated exceptional architectural intuition and clear communication regarding asynchronous event pipelines. Recommended focus on edge-case memory bounds under heavy concurrency.",
  strengths: [
    "Clean modular code structure with robust error handling",
    "Quantified resume claim defense for caching throughput",
    "Optimal linear time complexity on coding challenge",
  ],
  weaknesses: [
    "Slight hesitation on B-tree index balancing trade-offs",
    "Consider optimizing space complexity from O(N) to O(1)",
  ],
  roadmap: [
    {
      week: 1,
      focus: "Algorithmic Efficiency & Big-O Rigor",
      tasks: ["Drill 10 medium Two-Pointer problems", "Profile auxiliary memory via AST"],
    },
    {
      week: 2,
      focus: "System Design Trade-offs",
      tasks: ["Design distributed rate limiter with Redis", "Compare B-Tree vs LSM-Tree"],
    },
    {
      week: 3,
      focus: "Resume Claim Defense",
      tasks: ["Audit microservice circuit breakers", "Run 3 dynamic AI follow-up drills"],
    },
    {
      week: 4,
      focus: "Formal Assessment Simulation",
      tasks: ["Complete 60-min SEB lockdown exam", "Review longitudinal competency radar"],
    },
  ],
};

export const ScorecardView: React.FC<ScorecardViewProps> = ({ data = defaultData }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 text-xs text-slate-200">
      {/* Scorecard Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100">Multi-Dimensional Evaluation Scorecard</h2>
          <p className="text-slate-400">Institutional Competency & 30-Day Coaching Plan</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase text-slate-400 block font-semibold">Overall Index</span>
            <span className="text-2xl font-black text-indigo-400 font-mono">{data.overallScore}%</span>
          </div>
        </div>
      </div>

      {/* 5-Dimensional Competency Rubric */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Correctness", score: data.correctness, color: "text-emerald-400" },
          { label: "Complexity", score: data.complexity, color: "text-amber-400" },
          { label: "System Design", score: data.systemDesign, color: "text-indigo-400" },
          { label: "Communication", score: data.communication, color: "text-blue-400" },
          { label: "Veracity", score: data.veracity, color: "text-purple-400" },
        ].map((metric, i) => (
          <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block font-medium mb-1">{metric.label}</span>
            <span className={`text-lg font-bold font-mono ${metric.color}`}>{metric.score.toFixed(1)}/10</span>
          </div>
        ))}
      </div>

      {/* Executive Summary */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl leading-relaxed text-slate-300">
        <span className="font-bold text-slate-100 block mb-1">Executive Assessment:</span>
        {data.summary}
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl">
          <span className="font-bold text-emerald-400 block mb-2">Observed Strengths:</span>
          <ul className="space-y-1 list-disc pl-4 text-emerald-200">
            {data.strengths.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl">
          <span className="font-bold text-amber-400 block mb-2">Target Growth Areas:</span>
          <ul className="space-y-1 list-disc pl-4 text-amber-200">
            {data.weaknesses.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 30-Day Coaching Plan */}
      <div className="space-y-3 pt-2">
        <h3 className="font-bold text-slate-100 text-sm">Personalized 30-Day Practice Roadmap</h3>
        <div className="grid grid-cols-2 gap-3">
          {data.roadmap.map((week) => (
            <div key={week.week} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
              <span className="font-bold text-indigo-400 block">
                Week {week.week}: {week.focus}
              </span>
              <ul className="space-y-1 text-slate-400 pl-3 list-disc">
                {week.tasks.map((task, tidx) => (
                  <li key={tidx}>{task}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
