/**
 * ScoreHero — V2 report component.
 * Displays the 0-100 readiness score with rubric band and visual ring.
 */

import React from 'react';

interface ScoreHeroProps {
  readinessScore: number;       // 0–100
  rubricBand: string;           // Exceptional | Strong | Developing | Needs Work
  overallScore?: number;        // 0–10 raw score
  sessionRole?: string;
}

const BAND_COLORS: Record<string, { ring: string; text: string; bg: string }> = {
  'Exceptional':  { ring: '#22c55e', text: 'text-green-600',  bg: 'bg-green-50'  },
  'Strong':       { ring: '#3b82f6', text: 'text-blue-600',   bg: 'bg-blue-50'   },
  'Developing':   { ring: '#f59e0b', text: 'text-amber-600',  bg: 'bg-amber-50'  },
  'Needs Work':   { ring: '#ef4444', text: 'text-red-600',    bg: 'bg-red-50'    },
};

export const ScoreHero: React.FC<ScoreHeroProps> = ({
  readinessScore,
  rubricBand,
  overallScore,
  sessionRole,
}) => {
  const colors = BAND_COLORS[rubricBand] ?? BAND_COLORS['Developing'];
  const pct = Math.min(100, Math.max(0, readinessScore));
  const circumference = 2 * Math.PI * 44;  // r=44
  const offset = circumference * (1 - pct / 100);

  return (
    <div className={`rounded-2xl p-6 ${colors.bg} border border-gray-200 flex items-center gap-6`}>
      {/* Circular progress ring */}
      <div className="relative w-28 h-28 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke={colors.ring} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black ${colors.text}`}>{Math.round(pct)}</span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>

      {/* Text info */}
      <div>
        {sessionRole && (
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{sessionRole}</p>
        )}
        <h2 className="text-2xl font-black text-gray-900 mb-1">Readiness Score</h2>
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${colors.text} ${colors.bg} border`}>
          {rubricBand}
        </span>
        {overallScore !== undefined && (
          <p className="text-sm text-gray-500 mt-2">Raw score: {overallScore.toFixed(1)} / 10</p>
        )}
      </div>
    </div>
  );
};

export default ScoreHero;
