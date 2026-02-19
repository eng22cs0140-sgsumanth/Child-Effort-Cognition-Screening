
import React, { useState } from 'react';
import { ChildProfile } from '../types';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

export const ColorMaze: React.FC<Props> = ({ profile, onComplete }) => {
  const [path, setPath] = useState<number[]>([0]);
  const gridSize = 4;
  const target = 15; // Grid index 15

  const handleCellClick = (idx: number) => {
    const last = path[path.length - 1];
    const row = Math.floor(last / gridSize);
    const col = last % gridSize;
    const targetRow = Math.floor(idx / gridSize);
    const targetCol = idx % gridSize;

    // Check adjacency
    const isAdjacent = Math.abs(row - targetRow) + Math.abs(col - targetCol) === 1;
    
    if (isAdjacent && !path.includes(idx)) {
      const newPath = [...path, idx];
      setPath(newPath);
      if (idx === target) {
        setTimeout(() => onComplete({ score: 100, pathLength: newPath.length }), 1000);
      }
    }
  };

  return (
    <div className="flex flex-col h-full text-center max-w-xl mx-auto">
      <h2 className="text-3xl font-bold text-blue-600 mb-8">Find the Way to the Treasure! 🏴‍☠️</h2>
      <div className="bg-white p-8 rounded-[3rem] kids-shadow flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-4 gap-3 bg-blue-50 p-4 rounded-3xl border-4 border-blue-100">
          {Array.from({ length: gridSize * gridSize }).map((_, i) => (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              className={`aspect-square rounded-2xl transition-all text-3xl flex items-center justify-center border-b-4
                ${path.includes(i) ? 'bg-yellow-400 border-yellow-600' : 'bg-white border-gray-200 hover:bg-blue-100'}
                ${i === 0 ? 'bg-green-400 border-green-600' : ''}
                ${i === target ? 'bg-red-400 border-red-600 animate-pulse' : ''}
              `}
            >
              {i === 0 ? '🏠' : i === target ? '💰' : path.includes(i) ? '👣' : ''}
            </button>
          ))}
        </div>
        <p className="mt-8 text-xl font-bold text-purple-600">Click neighboring blocks to make a path!</p>
      </div>
    </div>
  );
};
