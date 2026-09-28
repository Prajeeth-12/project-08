/**
 * PrepListDisplay — V2 report component.
 * Shows actionable practice topics from the eval_engine prep_list.
 */

import React from 'react';

interface PrepItem {
  topic: string;
  reason?: string;
  priority?: number;
}

interface PrepListDisplayProps {
  items: PrepItem[];
}

export const PrepListDisplay: React.FC<PrepListDisplayProps> = ({ items }) => {
  if (!items?.length) return null;
  const sorted = [...items].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6">
      <h3 className="text-base font-bold text-gray-800 mb-4">Practice Topics</h3>
      <ul className="space-y-2">
        {sorted.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-[#DC2626] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{item.topic}</p>
              {item.reason && <p className="text-xs text-gray-500 mt-0.5">{item.reason}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PrepListDisplay;
