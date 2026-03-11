
import React, { useState } from 'react';
import { ChildProfile } from '../types';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const SHAPES = [
  { id: 'sq-red', icon: '🟥', type: 'square', color: 'red' },
  { id: 'cr-blue', icon: '🔵', type: 'circle', color: 'blue' },
  { id: 'tr-green', icon: '🔺', type: 'triangle', color: 'green' },
  { id: 'st-yellow', icon: '⭐', type: 'star', color: 'yellow' },
  { id: 'dm-purple', icon: '💎', type: 'diamond', color: 'purple' }
];

export const ShapeSorter: React.FC<Props> = ({ profile, onComplete }) => {
  const [placed, setPlaced] = useState<string[]>([]);
  const [activeShape, setActiveShape] = useState<string | null>(null);

  const handleMatch = (shapeId: string) => {
    if (placed.includes(shapeId)) return;
    setPlaced(prev => [...prev, shapeId]);
    if (placed.length + 1 === SHAPES.length) {
      setTimeout(() => onComplete({ score: 100, shapesSorted: SHAPES.length }), 1000);
    }
  };

  return (
    <div className="flex flex-col h-full text-center px-4">
      <h2 className="text-2xl md:text-3xl font-black text-blue-600 mb-6 tracking-tight">Match the Shapes!</h2>
      <div className="flex-1 bg-white p-6 rounded-[2rem] kids-shadow flex flex-col gap-8 justify-center border-2 border-blue-50">
        {/* Targets */}
        <div className="flex justify-center gap-4 flex-wrap">
          {SHAPES.map(s => (
            <div
              key={`target-${s.id}`}
              onClick={() => activeShape === s.id && handleMatch(s.id)}
              className={`w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 border-dashed flex items-center justify-center text-4xl transition-all cursor-pointer
                ${placed.includes(s.id) ? 'border-green-400 bg-green-50 opacity-100' : 'border-gray-200 opacity-30 hover:bg-blue-50'}
                ${activeShape === s.id ? 'ring-4 ring-blue-400 scale-110' : ''}`}
            >
              {s.icon}
            </div>
          ))}
        </div>

        {/* Source Pile */}
        <div className="flex justify-center gap-4 flex-wrap mt-4">
          {SHAPES.filter(s => !placed.includes(s.id)).map(s => (
            <button
              key={`source-${s.id}`}
              onClick={() => setActiveShape(s.id === activeShape ? null : s.id)}
              className={`text-5xl md:text-6xl p-3 rounded-xl kids-button-shadow transition-all
                ${activeShape === s.id ? 'scale-110 ring-4 ring-blue-400 bg-blue-50' : 'bg-gray-50 hover:scale-105'}`}
            >
              {s.icon}
            </button>
          ))}
        </div>
        <p className="text-gray-400 font-black text-sm italic mt-4">Tap a shape, then tap its matching shadow!</p>
      </div>
    </div>
  );
};
