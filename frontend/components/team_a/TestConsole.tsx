"use client";

import React, { useState } from "react";

interface TestConsoleProps {
  sourceCode: string;
  sessionId?: string;
  questionId?: string;
}

export const TestConsole: React.FC<TestConsoleProps> = ({ sourceCode, sessionId, questionId }) => {
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{
    status: string;
    stdout: string;
    stderr: string;
    executionTime: number;
    memoryUsed: number;
  } | null>(null);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch("http://localhost:8000/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: sourceCode,
          language: "python",
          stdin,
          session_id: sessionId,
          question_id: questionId,
        }),
      });
      const data = await res.json();
      setOutput({
        status: data.status,
        stdout: data.stdout,
        stderr: data.stderr,
        executionTime: data.execution_time,
        memoryUsed: data.memory_used,
      });
    } catch (err) {
      setOutput({
        status: "NETWORK_ERROR",
        stdout: "",
        stderr: "Failed to connect to execution sandbox backend.",
        executionTime: 0,
        memoryUsed: 0,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs">
        <span className="font-semibold text-slate-200">Execution Sandbox (Judge0)</span>
        <button
          onClick={handleRun}
          disabled={running}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded transition shadow"
        >
          {running ? "Running (2.0s bound)..." : "Run Code"}
        </button>
      </div>

      {/* Inputs & Output Split */}
      <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto font-mono text-xs">
        {/* Custom Stdin */}
        <div>
          <label className="text-slate-400 block mb-1">Standard Input (stdin):</label>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Pass custom test arguments here..."
            className="w-full h-16 p-2 bg-slate-950 text-slate-200 border border-slate-800 rounded focus:outline-none focus:border-slate-700 resize-none"
          />
        </div>

        {/* Execution Results */}
        {output && (
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  output.status === "ACCEPTED"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "bg-rose-950 text-rose-400 border border-rose-800"
                }`}
              >
                {output.status}
              </span>
              <span className="text-slate-400">Time: {output.executionTime.toFixed(3)}s</span>
              <span className="text-slate-400">Memory: {output.memoryUsed} KB</span>
            </div>

            {output.stdout && (
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                <span className="text-slate-500 block mb-1">Stdout:</span>
                <pre className="text-slate-100 whitespace-pre-wrap">{output.stdout}</pre>
              </div>
            )}

            {output.stderr && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded">
                <span className="text-rose-400 block mb-1">Stderr / Traceback:</span>
                <pre className="text-rose-200 whitespace-pre-wrap">{output.stderr}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
