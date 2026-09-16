"use client";

import React, { useState } from "react";
import { MonacoEditor } from "../components/team_a/MonacoEditor";
import { TestConsole } from "../components/team_a/TestConsole";
import { LiveCockpit } from "../components/team_a/LiveCockpit";
import { ProbingStatus } from "../components/team_a/ProbingStatus";
import { CodeReviewCard } from "../components/team_a/CodeReviewCard";
import { AuthModal } from "../components/team_b/AuthModal";
import { ResumeViewer } from "../components/team_b/ResumeViewer";
import { QuestionBank } from "../components/team_b/QuestionBank";
import { ExamPortal } from "../components/team_b/ExamPortal";
import { ScorecardView } from "../components/team_b/ScorecardView";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"track1" | "track2" | "scorecard" | "resume">("track1");
  const [user, setUser] = useState<{ id: string; role: string; full_name: string } | null>({
    id: "demo-cand-001",
    role: "CANDIDATE",
    full_name: "Prajeeth (Lead Candidate)",
  });
  const [code, setCode] = useState('def solve():\n    # Optimal solution\n    return "Project 08 Online"\n');

  return (
    <main className="min-h-screen flex flex-col bg-slate-950">
      {/* Platform Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg">
            08
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 tracking-wide">
              PROJECT 08: AI MOCK INTERVIEW & ASSESSMENT PLATFORM
            </h1>
            <p className="text-[11px] text-slate-400">Two-Track Intelligent Evaluation Engine</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
          <button
            onClick={() => setActiveTab("track1")}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              activeTab === "track1"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Track 1: Live AI Mock Interview
          </button>
          <button
            onClick={() => setActiveTab("track2")}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              activeTab === "track2"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Track 2: Formal SEB Exam
          </button>
          <button
            onClick={() => setActiveTab("resume")}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              activeTab === "resume"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Resume Intelligence
          </button>
          <button
            onClick={() => setActiveTab("scorecard")}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              activeTab === "scorecard"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Candidate Scorecard
          </button>
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-3 text-xs">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-200 font-semibold">{user.full_name}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-indigo-300 font-mono">
                {user.role}
              </span>
            </div>
          ) : (
            <span className="text-slate-500">Not signed in</span>
          )}
        </div>
      </header>

      {/* Main Assessment Body */}
      <div className="flex-1 p-6 overflow-hidden">
        {activeTab === "track1" && (
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-100px)]">
            {/* Left Column: Live Cockpit & Probing Agent */}
            <div className="col-span-5 flex flex-col gap-4 h-full">
              <div className="flex-1">
                <LiveCockpit sessionId="session-live-track1" roleTitle="Backend Architect" />
              </div>
              <div className="h-44">
                <ProbingStatus />
              </div>
            </div>

            {/* Right Column: In-Interview Monaco Coding Tool & Execution */}
            <div className="col-span-7 flex flex-col gap-4 h-full">
              <div className="flex-1">
                <MonacoEditor
                  sessionId="session-live-track1"
                  initialCode={code}
                  onCodeChange={setCode}
                />
              </div>
              <div className="h-60 grid grid-cols-2 gap-4">
                <TestConsole sourceCode={code} sessionId="session-live-track1" />
                <CodeReviewCard sourceCode={code} />
              </div>
            </div>
          </div>
        )}

        {activeTab === "track2" && (
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-100px)]">
            <div className="col-span-4 flex flex-col gap-4">
              <ExamPortal examId="exam-placement-2026" candidateId={user?.id || "cand-001"} />
              <QuestionBank />
            </div>
            <div className="col-span-8 flex flex-col gap-4">
              <div className="flex-1">
                <MonacoEditor
                  sessionId="exam-placement-2026"
                  initialCode={code}
                  onCodeChange={setCode}
                />
              </div>
              <div className="h-60">
                <TestConsole sourceCode={code} sessionId="exam-placement-2026" />
              </div>
            </div>
          </div>
        )}

        {activeTab === "resume" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <ResumeViewer userId={user?.id || "cand-001"} />
            <QuestionBank />
          </div>
        )}

        {activeTab === "scorecard" && (
          <div className="max-w-4xl mx-auto">
            <ScorecardView />
          </div>
        )}
      </div>
    </main>
  );
}
