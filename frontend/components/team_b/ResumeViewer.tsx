"use client";

import React, { useState } from "react";

interface ResumeViewerProps {
  userId: string;
  onClaimsLoaded?: (claims: string[]) => void;
}

export const ResumeViewer: React.FC<ResumeViewerProps> = ({ userId, onClaimsLoaded }) => {
  const [resumeText, setResumeText] = useState(
    "Senior Full Stack Engineer\nSkills: Python, FastAPI, PostgreSQL, Redis, React, Docker, Kubernetes\nProjects:\n- AI Mock Interview Platform: Scaled async workers handling 500 concurrent sessions.\n- Reduced query latency by 45% using Redis caching.\n- Designed resilient circuit breaker fallback for LLM API integration."
  );
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<{
    skills: string[];
    projects: string[];
    claims: string[];
  } | null>(null);

  const handleParse = async () => {
    setParsing(true);
    try {
      const res = await fetch("http://localhost:8000/api/resumes/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, resume_text: resumeText }),
      });
      const data = await res.json();
      setParsedData({
        skills: data.skills,
        projects: data.projects,
        claims: data.claims,
      });
      if (onClaimsLoaded) onClaimsLoaded(data.claims);
    } catch (err) {
      console.error(err);
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-xs space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-200">Resume Claim Intelligence</span>
        <button
          onClick={handleParse}
          disabled={parsing}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded font-medium transition"
        >
          {parsing ? "Parsing Claims..." : "Ingest Resume"}
        </button>
      </div>

      {!parsedData ? (
        <div>
          <label className="text-slate-400 block mb-1">Paste Resume Text / Project Experience:</label>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={5}
            className="w-full p-2.5 bg-slate-950 text-slate-200 border border-slate-800 rounded focus:outline-none focus:border-indigo-500 font-mono text-xs"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Skill Pills */}
          <div>
            <span className="font-semibold text-slate-400 block mb-1.5">Extracted Skills:</span>
            <div className="flex flex-wrap gap-1.5">
              {parsedData.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-indigo-950 border border-indigo-700 text-indigo-300 font-medium rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Verifiable Claims */}
          <div>
            <span className="font-semibold text-slate-400 block mb-1.5">
              Verifiable Technical Claims (Anchored to Probing Agent):
            </span>
            <ul className="space-y-1.5">
              {parsedData.claims.map((claim, idx) => (
                <li
                  key={idx}
                  className="p-2 bg-slate-950 border border-slate-800 rounded text-slate-300 flex items-start gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>{claim}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
