
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
    <div className="flex flex-col h-full text-center max-w-lg mx-auto px-2">
      <h2 className="text-2xl font-black text-blue-600 mb-4 tracking-tight">Find the Treasure! 🏴‍☠️</h2>
      <div className="bg-white p-6 rounded-[2rem] kids-shadow flex-1 flex flex-col justify-center items-center border-2 border-blue-50">
        <div className="grid grid-cols-4 gap-2 bg-blue-50 p-3 rounded-2xl border-2 border-blue-100 w-full max-w-[320px]">
          {Array.from({ length: gridSize * gridSize }).map((_, i) => (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              className={`aspect-square rounded-xl transition-all text-2xl flex items-center justify-center border-b-2
                ${path.includes(i) ? 'bg-yellow-400 border-yellow-600' : 'bg-white border-gray-200 hover:bg-blue-100'}
                ${i === 0 ? 'bg-green-400 border-green-600' : ''}
                ${i === target ? 'bg-red-400 border-red-600 animate-pulse' : ''}
              `}
            >
              {i === 0 ? '🏠' : i === target ? '💰' : path.includes(i) ? '👣' : ''}
            </button>
          ))}
        </div>
        <p className="mt-6 text-lg font-black text-purple-600">Click blocks to make a path!</p>
      </div>
    </div>
  );
};
