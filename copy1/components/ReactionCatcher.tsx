
import React, { useState, useEffect, useRef } from 'react';
import { ChildProfile } from '../types';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const OBJECTS = ['⭐', '🦋', '🎈', '🌟', '🍎', '🍓'];

export const ReactionCatcher: React.FC<Props> = ({ profile, onComplete }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [items, setItems] = useState<{ id: number; x: number; y: number; char: string; startTime: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameActive = useRef(true);

  // Adaptive difficulty
  const spawnRate = Math.max(500, 2000 - (profile.age * 150));
  const fallSpeed = Math.min(8, 3 + (profile.age / 2));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          gameActive.current = false;
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const spawner = setInterval(() => {
      if (!gameActive.current) return;
      if (containerRef.current) {
        const x = Math.random() * (containerRef.current.clientWidth - 60);
        setItems(prev => [...prev, {
          id: Date.now() + Math.random(),
          x,
          y: -50,
          char: OBJECTS[Math.floor(Math.random() * OBJECTS.length)],
          startTime: Date.now()
        }]);
      }
    }, spawnRate);

    return () => {
      clearInterval(timer);
      clearInterval(spawner);
    };
  }, [spawnRate, profile.age]);

  useEffect(() => {
    if (timeLeft === 0) {
      onComplete({ score, age: profile.age });
    }
  }, [timeLeft]);

  useEffect(() => {
    const moveItems = setInterval(() => {
      setItems(prev => prev
        .map(item => ({ ...item, y: item.y + fallSpeed }))
        .filter(item => item.y < (containerRef.current?.clientHeight || 0) + 50)
      );
    }, 50);
    return () => clearInterval(moveItems);
  }, [fallSpeed]);

  const handleCatch = (id: number) => {
    setScore(s => s + 10);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="flex flex-col h-full px-2">
      <div className="flex justify-between items-center mb-3 p-3 bg-white rounded-xl kids-shadow">
        <div className="text-xl font-black text-orange-500">Score: {score}</div>
        <div className="text-xl font-black text-purple-600">Time: {timeLeft}s</div>
      </div>
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-blue-50 rounded-[2rem] border-2 border-blue-200 min-h-[300px]"
      >
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => handleCatch(item.id)}
            className="absolute text-4xl md:text-5xl transition-transform hover:scale-110 active:scale-90 select-none cursor-pointer"
            style={{ left: item.x, top: item.y }}
          >
            {item.char}
          </button>
        ))}
        {timeLeft > 25 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 p-6 rounded-2xl text-center shadow-xl border-2 border-purple-100">
              <h2 className="text-2xl font-black text-purple-600 mb-1">Catch the toys!</h2>
              <p className="text-gray-500 font-bold text-sm">Tap them as they fall!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
