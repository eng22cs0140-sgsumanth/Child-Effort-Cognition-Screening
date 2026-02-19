
import React, { useState } from 'react';
import { ChildProfile } from '../types';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const ITEMS = [
  { icon: '🍎', category: 'Food' },
  { icon: '🐘', category: 'Animal' },
  { icon: '🍕', category: 'Food' },
  { icon: '🦁', category: 'Animal' },
  { icon: '🍌', category: 'Food' },
  { icon: '🦒', category: 'Animal' }
];

export const CategorySort: React.FC<Props> = ({ profile, onComplete }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');

  const target = ITEMS[currentIdx];

  const handleSort = (cat: string) => {
    if (cat === target.category) {
      setScore(s => s + 1);
      setFeedback('Great sorting! 📦');
    } else {
      setFeedback('Think again! Is it a food or an animal?');
    }

    setTimeout(() => {
      setFeedback('');
      if (currentIdx + 1 < ITEMS.length) {
        setCurrentIdx(i => i + 1);
      } else {
        onComplete({ score: score + 1, total: ITEMS.length });
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full text-center max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-green-600 mb-8">What group does this belong to?</h2>
      <div className="bg-white p-12 rounded-[3rem] kids-shadow flex-1 flex flex-col justify-center items-center">
        <div className="text-[10rem] mb-12 bg-green-50 p-10 rounded-full w-64 h-64 flex items-center justify-center animate-bounce">
          {target.icon}
        </div>
        
        {feedback && <p className={`text-2xl font-bold mb-8 ${feedback.includes('Great') ? 'text-green-500' : 'text-orange-500'}`}>{feedback}</p>}
        
        <div className="flex gap-8 w-full">
          <button 
            onClick={() => handleSort('Food')}
            className="flex-1 bg-yellow-400 text-white p-8 rounded-[2rem] kids-button-shadow font-bold text-3xl hover:bg-yellow-300"
          >
            🍎 Food
          </button>
          <button 
            onClick={() => handleSort('Animal')}
            className="flex-1 bg-blue-500 text-white p-8 rounded-[2rem] kids-button-shadow font-bold text-3xl hover:bg-blue-400"
          >
            🐘 Animal
          </button>
        </div>
      </div>
    </div>
  );
};
