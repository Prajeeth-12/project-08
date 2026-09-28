"use client";

import React, { useState } from "react";

interface Message {
  sender: "AI" | "CANDIDATE";
  content: string;
}

interface LiveCockpitProps {
  sessionId: string;
  roleTitle?: string;
  initialTranscript?: Message[];
  onStageChange?: (stage: string) => void;
}

export const LiveCockpit: React.FC<LiveCockpitProps> = ({
  sessionId,
  roleTitle = "Full Stack Engineer",
  initialTranscript = [],
  onStageChange,
}) => {
  const [transcript, setTranscript] = useState<Message[]>(initialTranscript);
  const [currentResponse, setCurrentResponse] = useState("");
  const [currentStage, setCurrentStage] = useState("TECH");
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!currentResponse.trim()) return;

    const newMsg: Message = { sender: "CANDIDATE", content: currentResponse };
    setTranscript((prev) => [...prev, newMsg]);
    const answerText = currentResponse;
    setCurrentResponse("");
    setLoading(true);

    try {
      // 1. Post candidate message turn
      await fetch(`http://localhost:8000/api/sessions/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: "CANDIDATE", content: answerText }),
      });

      // 2. Trigger dynamic probing agent
      const probeRes = await fetch("http://localhost:8000/api/ai/live-probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          candidate_response: answerText,
          turn_index: transcript.filter((m) => m.sender === "CANDIDATE").length + 1,
        }),
      });
      const probeData = await probeRes.json();

      // Append AI probing follow-up
      const aiMsg: Message = { sender: "AI", content: probeData.probe_question };
      setTranscript((prev) => [...prev, aiMsg]);

      // If probe decides to transition to coding
      if (probeData.decision === "INVOKE_CODING") {
        setCurrentStage("CODING_TOOL");
        if (onStageChange) onStageChange("CODING_TOOL");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Live Cockpit Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">{roleTitle} Mock Interview</h3>
            <p className="text-xs text-slate-400">Session ID: {sessionId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-indigo-950 border border-indigo-700 text-indigo-300 font-semibold rounded">
            Stage: {currentStage}
          </span>
        </div>
      </div>

      {/* Real-time Conversation Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {transcript.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col max-w-[85%] ${
              msg.sender === "CANDIDATE" ? "ml-auto items-end" : "mr-auto items-start"
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">
              {msg.sender === "AI" ? "AI Interviewer (Probing Loop)" : "Candidate"}
            </span>
            <div
              className={`p-3 rounded-xl text-sm leading-relaxed ${
                msg.sender === "CANDIDATE"
                  ? "bg-indigo-600 text-white rounded-br-none"
                  : "bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            Interviewer is observing your response and reasoning on technical depth...
          </div>
        )}
      </div>

      {/* Candidate Response Composer */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={currentResponse}
          onChange={(e) => setCurrentResponse(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Articulate your architectural decision or explanation..."
          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleSendMessage}
          disabled={loading || !currentResponse.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition"
        >
          Send
        </button>
      </div>
    </div>
  );
};
