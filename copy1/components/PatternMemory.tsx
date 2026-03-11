
import React, { useState, useEffect } from 'react';
import { ChildProfile } from '../types';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const ITEMS = [
  { char: '🐱', color: 'bg-red-400' },
  { char: '🐶', color: 'bg-blue-400' },
  { char: '🐰', color: 'bg-green-400' },
  { char: '🦁', color: 'bg-yellow-400' },
  { char: '🐼', color: 'bg-purple-400' }
];

export const PatternMemory: React.FC<Props> = ({ profile, onComplete }) => {
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [isShowing, setIsShowing] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [message, setMessage] = useState('Get ready!');

  const maxLevel = 5;
  const sequenceLength = Math.min(level + 1 + Math.floor(profile.age / 4), 8);

  const startLevel = () => {
    const newSequence = Array.from({ length: sequenceLength }, () => Math.floor(Math.random() * ITEMS.length));
    setSequence(newSequence);
    setUserSequence([]);
    setIsShowing(true);
    setMessage('Watch carefully!');

    let i = 0;
    const interval = setInterval(() => {
      if (i >= newSequence.length) {
        clearInterval(interval);
        setIsShowing(false);
        setActiveIdx(null);
        setMessage('Now you repeat!');
        return;
      }
      setActiveIdx(newSequence[i]);
      i++;
    }, 1000);
  };

  useEffect(() => {
    setTimeout(startLevel, 1000);
  }, [level]);

  const handleItemClick = (idx: number) => {
    if (isShowing) return;

    const nextSequence = [...userSequence, idx];
    setUserSequence(nextSequence);

    if (idx !== sequence[userSequence.length]) {
      setMessage('Oops! Let\'s try that again.');
      setTimeout(startLevel, 1500);
      return;
    }

    if (nextSequence.length === sequence.length) {
      if (level >= maxLevel) {
        onComplete({ level, score: level * 100 });
      } else {
        setMessage('Great job!');
        setTimeout(() => setLevel(l => l + 1), 1000);
      }
    }
  };

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto px-2">
      <div className="flex justify-between items-center mb-4 p-3 bg-white rounded-xl kids-shadow">
        <div className="text-xl font-black text-blue-500">Level: {level} / {maxLevel}</div>
        <div className="text-lg font-black text-gray-400">{message}</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-white p-6 rounded-[2rem] kids-shadow border-2 border-purple-50">
        <div className="flex gap-2 min-h-[60px] flex-wrap justify-center">
          {userSequence.map((idx, i) => (
            <div key={i} className={`text-3xl p-3 rounded-lg ${ITEMS[idx].color} kids-shadow animate-pop-in`}>
              {ITEMS[idx].char}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-3 w-full">
          {ITEMS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleItemClick(idx)}
              disabled={isShowing}
              className={`
                text-4xl p-4 rounded-xl kids-button-shadow transition-all
                ${item.color}
                ${activeIdx === idx ? 'scale-110 border-2 border-white' : 'scale-100'}
                ${isShowing ? 'opacity-80' : 'hover:scale-105 active:scale-95'}
              `}
            >
              {item.char}
            </button>
          ))}
        </div>
        <p className="text-gray-400 font-black text-xs italic">Watch the pattern, then repeat it!</p>
      </div>
    </div>
  );
};
