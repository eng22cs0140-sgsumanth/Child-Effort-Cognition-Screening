
import React, { useState, useEffect, useRef } from 'react';
import { ChildProfile } from '../types';
import { calculateBehavioralMetrics } from '../ceciAlgorithm';

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

  // Behavioral metrics tracking
  const reactionTimes = useRef<number[]>([]);
  const correctCatches = useRef(0);
  const missedItems = useRef(0);
  const clickCount = useRef(0);
  const gameStartTime = useRef(Date.now());

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
      // Calculate engagement score based on activity
      const gameDuration = (Date.now() - gameStartTime.current) / 1000;
      const clicksPerSecond = clickCount.current / gameDuration;
      const engagementScore = Math.min(100, (clicksPerSecond / 2) * 100); // Normalize

      // Calculate behavioral metrics
      const behavioralMetrics = calculateBehavioralMetrics(
        reactionTimes.current,
        correctCatches.current,
        missedItems.current,
        engagementScore
      );

      onComplete({
        score,
        age: profile.age,
        behavioralMetrics
      });
    }
  }, [timeLeft]);

  useEffect(() => {
    const moveItems = setInterval(() => {
      setItems(prev => {
        const updated = prev.map(item => ({ ...item, y: item.y + fallSpeed }));
        const containerHeight = containerRef.current?.clientHeight || 0;

        // Track missed items (fell off screen)
        updated.forEach(item => {
          if (item.y >= containerHeight + 50) {
            missedItems.current++;
          }
        });

        return updated.filter(item => item.y < containerHeight + 50);
      });
    }, 50);
    return () => clearInterval(moveItems);
  }, [fallSpeed]);

  const handleCatch = (id: number, startTime: number) => {
    const reactionTime = Date.now() - startTime;
    reactionTimes.current.push(reactionTime);
    correctCatches.current++;
    clickCount.current++;

    setScore(s => s + 10);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 p-4 bg-white rounded-2xl kids-shadow">
        <div className="text-2xl font-bold text-orange-500">Score: {score}</div>
        <div className="text-2xl font-bold text-purple-600">Time: {timeLeft}s</div>
      </div>
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-blue-50 rounded-3xl border-4 border-blue-200"
      >
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => handleCatch(item.id, item.startTime)}
            className="absolute text-5xl transition-transform hover:scale-110 active:scale-90 select-none cursor-pointer"
            style={{ left: item.x, top: item.y }}
          >
            {item.char}
          </button>
        ))}
        {timeLeft > 25 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/80 p-8 rounded-2xl text-center">
              <h2 className="text-3xl font-bold text-purple-600 mb-2">Tap the falling toys!</h2>
              <p className="text-gray-600">Catch as many as you can!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
