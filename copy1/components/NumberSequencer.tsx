
import React, { useState, useEffect, useRef } from 'react';
import { ChildProfile } from '../types';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

type Phase = 'show' | 'recall' | 'done';

export const NumberSequencer: React.FC<Props> = ({ profile, onComplete }) => {
  const N = profile.age >= 6 ? 9 : 5;
  const [phase, setPhase] = useState<Phase>('show');
  const [showIndex, setShowIndex] = useState(0);
  const [nextExpected, setNextExpected] = useState(1);
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const [incorrectFlash, setIncorrectFlash] = useState<number | null>(null);
  const [message, setMessage] = useState('Watch the numbers appear!');
  const positions = useRef<number[]>([]);
  const correctAttempts = useRef(0);
  const incorrectAttempts = useRef(0);
  const reactionTimes = useRef<number[]>([]);
  const gameStartTime = useRef(Date.now());
  const lastTapTime = useRef(Date.now());
  const emptySpaceTaps = useRef(0);

  useEffect(() => {
    const nums = Array.from({ length: N }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    positions.current = nums;
  }, [N]);

  useEffect(() => {
    if (phase !== 'show') return;
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setShowIndex(idx);
      if (idx >= N) {
        clearInterval(interval);
        setTimeout(() => {
          setShowIndex(0);
          setPhase('recall');
          setMessage(`Now tap the numbers in order: 1, 2, 3...`);
          lastTapTime.current = Date.now();
        }, 800);
      }
    }, 700);
    return () => clearInterval(interval);
  }, [phase, N]);

  const handleNumberTap = (num: number) => {
    if (phase !== 'recall') return;
    const now = Date.now();
    const rt = now - lastTapTime.current;
    lastTapTime.current = now;

    if (num === nextExpected) {
      reactionTimes.current.push(rt);
      correctAttempts.current++;
      const newTapped = new Set(tapped);
      newTapped.add(num);
      setTapped(newTapped);
      if (num === N) {
        const totalTime = Date.now() - gameStartTime.current;
        const behavioralMetrics = {
          reactionTimes: reactionTimes.current,
          accuracy: (correctAttempts.current / (correctAttempts.current + incorrectAttempts.current)) * 100,
          hesitationCount: reactionTimes.current.filter(r => r > 2000).length,
          engagementScore: Math.min(100, (correctAttempts.current / N) * 100),
          correctAttempts: correctAttempts.current,
          incorrectAttempts: incorrectAttempts.current,
          averageReactionTime: reactionTimes.current.reduce((a, b) => a + b, 0) / Math.max(reactionTimes.current.length, 1),
          reactionTimeVariability: 0,
          totalTapCount: correctAttempts.current + incorrectAttempts.current + emptySpaceTaps.current,
          emptySpaceTapCount: emptySpaceTaps.current,
          consecutiveEmptySpaceTaps: 0,
          impulsiveTapCount: reactionTimes.current.filter(r => r < 200).length,
          tapEventLog: [],
          withinSessionDegradation: 0,
          frustrationBurstCount: 0,
          engagementDropRate: 0,
          reactionTimeSpikeCount: 0,
        };
        setMessage('Amazing! You got them all!');
        setPhase('done');
        setTimeout(() => onComplete({ score: 100, N, totalTime, behavioralMetrics }), 1500);
      } else {
        setNextExpected(num + 1);
      }
    } else {
      incorrectAttempts.current++;
      setIncorrectFlash(num);
      setMessage(`Not quite! Look for ${nextExpected}`);
      setTimeout(() => setIncorrectFlash(null), 500);
    }
  };

  const handleBgClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-num]')) return;
    emptySpaceTaps.current++;
  };

  const getCellClass = (num: number) => {
    const isShowing = phase === 'show' && showIndex === num;
    const isTapped = tapped.has(num);
    const isWrong = incorrectFlash === num;
    if (isWrong) return 'bg-red-500 text-white scale-110 border-red-700';
    if (isTapped) return 'bg-green-500 text-white border-green-700';
    if (isShowing) return 'bg-orange-400 text-white scale-110 border-orange-600';
    return 'bg-white text-purple-700 border-purple-200 hover:border-purple-400';
  };

  return (
    <div className="flex flex-col h-full text-center px-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-black text-purple-700">Number Sequencer</h2>
        <span className="text-xl font-black text-orange-500">{tapped.size}/{N}</span>
      </div>
      <p className="text-base font-bold text-gray-600 mb-4">{message}</p>
      <div
        className="flex-1 bg-blue-50 rounded-2xl border-2 border-blue-200 p-4 flex items-center justify-center cursor-pointer"
        onClick={handleBgClick}
      >
        <div className={`grid gap-3 ${N === 9 ? 'grid-cols-3' : 'grid-cols-3'}`}>
          {positions.current.map((num, idx) => (
            <button
              key={idx}
              data-num={num}
              onClick={(e) => { e.stopPropagation(); handleNumberTap(num); }}
              disabled={phase !== 'recall' || tapped.has(num)}
              className={`w-16 h-16 text-2xl font-black rounded-2xl border-4 transition-all active:scale-95 shadow-md ${getCellClass(num)} disabled:opacity-50`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
      {phase === 'recall' && (
        <p className="mt-3 text-base text-gray-500 font-semibold">
          Tap: <span className="text-orange-500 font-black text-xl">{nextExpected}</span> next
        </p>
      )}
    </div>
  );
};
