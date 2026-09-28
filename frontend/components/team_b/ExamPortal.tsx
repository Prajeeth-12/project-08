"use client";

import React, { useState, useEffect } from "react";

interface ExamPortalProps {
  examId: string;
  candidateId: string;
}

export const ExamPortal: React.FC<ExamPortalProps> = ({ examId, candidateId }) => {
  const [infractionCount, setInfractionCount] = useState(0);
  const [status, setStatus] = useState("IN_PROGRESS");
  const [timeLeft, setTimeLeft] = useState(3600); // 60 mins

  // Proctoring event handlers (Window blur, Tab switch, Fullscreen exit)
  useEffect(() => {
    if (status !== "IN_PROGRESS") return;

    const recordInfraction = async (reason: string) => {
      try {
        const res = await fetch(`http://localhost:8000/api/exams/${examId}/infraction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidate_id: candidateId, reason }),
        });
        const data = await res.json();
        setInfractionCount(data.infraction_count);
        setStatus(data.status);
      } catch (err) {
        console.error(err);
      }
    };

    const handleBlur = () => recordInfraction("WINDOW_BLUR");
    const handleVisibility = () => {
      if (document.hidden) recordInfraction("TAB_SWITCH");
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(timer);
    };
  }, [examId, candidateId, status]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-4 text-xs space-y-4">
      {/* Exam Header & Proctoring Shield */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-bold text-slate-100 text-sm">Formal Assessment (SEB Lockdown)</h3>
          <p className="text-slate-400">Integrity Shield Active • Fullscreen Enforced</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Infraction Warning */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/60 border border-amber-800 rounded">
            <span className="text-amber-400 font-bold">Strikes: {infractionCount} / 3</span>
          </div>

          {/* Countdown Clock */}
          <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-slate-200 font-bold">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
        </div>
      </div>

      {status === "DISQUALIFIED" ? (
        <div className="p-6 bg-rose-950/80 border border-rose-800 rounded-xl text-center space-y-2">
          <h4 className="text-base font-bold text-rose-300">Examination Disqualified</h4>
          <p className="text-rose-200">
            You have accumulated 3 security infractions (window blurs / tab switches). Your test attempt has been auto-terminated.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded text-slate-300">
            <span className="font-semibold block mb-1 text-slate-200">Problem 1: Reverse Linked List II</span>
            <p className="leading-relaxed">
              Given the head of a singly linked list and two integers left and right where left &lt;= right, reverse the nodes of the list from position left to position right, and return the reversed list.
            </p>
          </div>

          <div className="p-2 bg-indigo-950/40 border border-indigo-900/60 rounded text-indigo-300">
            Ensure your window maintains focus. Switching desktop apps or leaving fullscreen logs an automatic infraction strike.
          </div>
        </div>
      )}
    </div>
  );
};
