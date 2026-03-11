
import React, { useState } from 'react';
import { ChildProfile } from '../types';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const ITEMS = [
  { icon: '🍎', category: 'Food', name: 'Apple' },
  { icon: '🐘', category: 'Animal', name: 'Elephant' },
  { icon: '🍕', category: 'Food', name: 'Pizza' },
  { icon: '🦁', category: 'Animal', name: 'Lion' },
  { icon: '🍌', category: 'Food', name: 'Banana' },
  { icon: '🦒', category: 'Animal', name: 'Giraffe' },
  { icon: '🥦', category: 'Food', name: 'Broccoli' },
  { icon: '🐼', category: 'Animal', name: 'Panda' },
  { icon: '🍦', category: 'Food', name: 'Ice Cream' },
  { icon: '🦓', category: 'Animal', name: 'Zebra' }
];

export const CategorySort: React.FC<Props> = ({ profile, onComplete }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const target = ITEMS[currentIdx];

  const handleSort = (cat: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const isCorrect = cat === target.category;
    const newScore = isCorrect ? score + 1 : score;

    if (isCorrect) {
      setScore(newScore);
      setFeedback('Great sorting! 📦✨');
    } else {
      setFeedback(`Oops! ${target.name} is a ${target.category}!`);
    }

    setTimeout(() => {
      setFeedback('');
      setIsProcessing(false);
      if (currentIdx + 1 < ITEMS.length) {
        setCurrentIdx(i => i + 1);
      } else {
        onComplete({ score: Math.round((newScore / ITEMS.length) * 100), total: ITEMS.length });
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full text-center max-w-5xl mx-auto px-4">
      <div className="mb-8">
        <h2 className="text-5xl font-black text-green-600 mb-4 tracking-tight">What group does this belong to?</h2>
        <div className="w-full bg-green-100 h-6 rounded-full overflow-hidden kids-shadow">
          <div
            className="bg-green-500 h-full transition-all duration-500"
            style={{ width: `${((currentIdx) / ITEMS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[3rem] kids-shadow border-4 border-green-50 flex-1 flex flex-col justify-center items-center relative">
        <div className="absolute top-4 right-6 text-lg font-black text-green-300">
          {currentIdx + 1} / {ITEMS.length}
        </div>

        <div className="text-7xl md:text-8xl mb-6 bg-green-50 p-6 rounded-[2rem] w-40 h-40 md:w-48 md:h-48 flex items-center justify-center animate-bounce drop-shadow-lg border-2 border-white">
          {target.icon}
        </div>

        <div className="h-12 flex items-center justify-center mb-6">
          {feedback && (
            <p className={`text-xl md:text-2xl font-black animate-pop-in ${feedback.includes('Great') ? 'text-green-500' : 'text-orange-500'}`}>
              {feedback}
            </p>
          )}
        </div>

        <div className="flex gap-4 w-full max-w-lg">
          <button
            disabled={isProcessing}
            onClick={() => handleSort('Food')}
            className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-white p-6 rounded-[2rem] kids-button-shadow font-black text-2xl md:text-3xl transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <span className="text-4xl">🍎</span>
            FOOD
          </button>
          <button
            disabled={isProcessing}
            onClick={() => handleSort('Animal')}
            className="flex-1 bg-blue-500 hover:bg-blue-400 text-white p-6 rounded-[2rem] kids-button-shadow font-black text-2xl md:text-3xl transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <span className="text-4xl">🐘</span>
            ANIMAL
          </button>
        </div>
      </div>
      <p className="text-green-400 font-black text-lg italic mt-4">You're a master at organizing! 🧹</p>
    </div>
  );
};
