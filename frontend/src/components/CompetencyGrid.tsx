/**
 * CompetencyGrid — V2 report component.
 * Visual breakdown of scores per dimension (Technical, Communication, etc.)
 */

import React from 'react';

interface CompetencyScore {
  name: string;
  score: number;
  maxScore?: number;
}

interface CompetencyGridProps {
  dimensionScores: Record<string, number> | CompetencyScore[];
  maxScore?: number;
}

export const CompetencyGrid: React.FC<CompetencyGridProps> = ({ dimensionScores, maxScore = 10 }) => {
  const items: CompetencyScore[] = Array.isArray(dimensionScores)
    ? dimensionScores
    : Object.entries(dimensionScores).map(([name, score]) => ({ name, score }));

  const color = (score: number) => {
    const pct = score / maxScore;
    if (pct >= 0.8) return { bar: 'bg-green-500',  text: 'text-green-700'  };
    if (pct >= 0.6) return { bar: 'bg-blue-500',   text: 'text-blue-700'   };
    if (pct >= 0.4) return { bar: 'bg-amber-500',  text: 'text-amber-700'  };
    return            { bar: 'bg-red-500',    text: 'text-red-700'    };
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6">
      <h3 className="text-base font-bold text-gray-800 mb-4">Competency Breakdown</h3>
      <div className="space-y-3">
        {items.map(({ name, score }) => {
          const { bar, text } = color(score);
          const pct = Math.round((score / maxScore) * 100);
          return (
            <div key={name}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">{name}</span>
                <span className={`text-sm font-bold ${text}`}>{score.toFixed(1)}/{maxScore}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${bar} rounded-full transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompetencyGrid;
