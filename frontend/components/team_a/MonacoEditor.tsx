"use client";

import React, { useState, useEffect } from "react";

interface MonacoEditorProps {
  initialCode?: string;
  sessionId: string;
  onCodeChange?: (code: string) => void;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  initialCode = 'def solve():\n    # Write your solution here\n    print("Hello, Project 08!")\n',
  sessionId,
  onCodeChange,
}) => {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState("python");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  // Auto-save debounce effect (500ms)
  useEffect(() => {
    setSaveStatus("unsaved");
    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await fetch("http://localhost:8000/api/code/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            language,
            code_content: code,
          }),
        });
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("unsaved");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [code, language, sessionId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
    if (onCodeChange) onCodeChange(e.target.value);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200">Editor Workspace</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Select Programming Language"
            className="bg-slate-800 text-slate-300 rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="python">Python 3.11</option>
            <option value="javascript">JavaScript (Node)</option>
            <option value="cpp">C++ 20</option>
            <option value="java">Java 17</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              saveStatus === "saved"
                ? "bg-emerald-400"
                : saveStatus === "saving"
                ? "bg-amber-400 animate-pulse"
                : "bg-slate-500"
            }`}
          />
          <span className="text-slate-400 capitalize">{saveStatus}</span>
        </div>
      </div>

      {/* Code Editor Surface */}
      <textarea
        value={code}
        onChange={handleChange}
        aria-label="Code Editor Input Area"
        placeholder="Enter your solution..."
        className="flex-1 p-4 bg-slate-950 font-mono text-sm text-slate-100 resize-none focus:outline-none focus:ring-0 leading-relaxed"
        spellCheck={false}
      />
    </div>
  );
};
