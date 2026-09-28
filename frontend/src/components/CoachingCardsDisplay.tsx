/**
 * CoachingCardsDisplay — V2 report component.
 * Shows Say / Avoid / Fix coaching cards per competency.
 */

import React from 'react';

interface CoachingCard {
  competency?: string;
  say?: string;
  avoid?: string;
  fix?: string;
}

interface CoachingCardsDisplayProps {
  cards: CoachingCard[];
}

const CardSection: React.FC<{ label: string; text: string; color: string }> = ({ label, text, color }) => (
  <div className={`rounded-lg p-3 ${color}`}>
    <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70">{label}</p>
    <p className="text-sm text-gray-800">{text}</p>
  </div>
);

export const CoachingCardsDisplay: React.FC<CoachingCardsDisplayProps> = ({ cards }) => {
  if (!cards?.length) return null;

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6">
      <h3 className="text-base font-bold text-gray-800 mb-4">Coaching Cards</h3>
      <div className="space-y-4">
        {cards.map((card, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-4">
            {card.competency && (
              <p className="text-xs font-bold text-[#DC2626] uppercase tracking-wider mb-3">{card.competency}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {card.say   && <CardSection label="✅ Say"   text={card.say}   color="bg-green-50" />}
              {card.avoid && <CardSection label="❌ Avoid" text={card.avoid} color="bg-red-50"   />}
              {card.fix   && <CardSection label="🔧 Fix"   text={card.fix}   color="bg-amber-50" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoachingCardsDisplay;
