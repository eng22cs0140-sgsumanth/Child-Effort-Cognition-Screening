
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
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8 p-4 bg-white rounded-2xl kids-shadow">
        <div className="text-2xl font-bold text-blue-500">Level: {level} / {maxLevel}</div>
        <div className="text-xl font-medium text-gray-600">{message}</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-white p-8 rounded-3xl kids-shadow">
        <div className="flex gap-4 min-h-[100px] flex-wrap justify-center">
          {userSequence.map((idx, i) => (
            <div key={i} className={`text-5xl p-4 rounded-xl ${ITEMS[idx].color} kids-shadow`}>
              {ITEMS[idx].char}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-4 w-full">
          {ITEMS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleItemClick(idx)}
              disabled={isShowing}
              className={`
                text-5xl p-6 rounded-2xl kids-button-shadow transition-all
                ${item.color}
                ${activeIdx === idx ? 'scale-125 border-4 border-white' : 'scale-100'}
                ${isShowing ? 'opacity-80' : 'hover:scale-105 active:scale-95'}
              `}
            >
              {item.char}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
