"use client";

import React, { useState, useEffect } from "react";

interface Question {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  category: string;
  description: string;
  starter_code: string;
}

interface QuestionBankProps {
  onSelectQuestion?: (q: Question) => void;
}

export const QuestionBank: React.FC<QuestionBankProps> = ({ onSelectQuestion }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const url = filterDifficulty
          ? `http://localhost:8000/api/questions?difficulty=${filterDifficulty}`
          : "http://localhost:8000/api/questions";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setQuestions(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [filterDifficulty]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-xs space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-200">Coding Question Bank</span>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="bg-slate-950 text-slate-300 border border-slate-700 rounded px-2 py-1"
        >
          <option value="">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading problem pools...</p>
      ) : questions.length === 0 ? (
        <p className="text-slate-500 italic">No questions found in this pool category.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {questions.map((q) => (
            <div
              key={q.id}
              onClick={() => onSelectQuestion && onSelectQuestion(q)}
              className="p-2.5 bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded cursor-pointer transition flex items-center justify-between"
            >
              <div>
                <h4 className="font-semibold text-slate-200">{q.title}</h4>
                <span className="text-[10px] text-slate-500">{q.category}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                  q.difficulty === "HARD"
                    ? "text-rose-400 bg-rose-950/40"
                    : q.difficulty === "MEDIUM"
                    ? "text-amber-400 bg-amber-950/40"
                    : "text-emerald-400 bg-emerald-950/40"
                }`}
              >
                {q.difficulty}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
