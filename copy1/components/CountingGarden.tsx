
import React, { useState, useEffect } from 'react';
import { ChildProfile } from '../types';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const GARDEN_ITEMS = ['🌸', '🦋', '🐝', '🌻', '🐞'];

export const CountingGarden: React.FC<Props> = ({ profile, onComplete }) => {
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(0);
  const [items, setItems] = useState<{ x: number; y: number; char: string }[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const num = Math.floor(Math.random() * 5) + (profile.age > 5 ? 5 : 3);
    setTarget(num);
    const char = GARDEN_ITEMS[Math.floor(Math.random() * GARDEN_ITEMS.length)];
    const newItems = Array.from({ length: num }, () => ({
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      char
    }));
    setItems(newItems);
  }, []);

  const checkAnswer = (val: number) => {
    if (val === target) {
      setMessage('Amazing! You can count so well! ✨');
      setTimeout(() => onComplete({ score: 100, target }), 2000);
    } else {
      setMessage('Try counting them one more time!');
    }
  };

  return (
    <div className="flex flex-col h-full text-center">
      <h2 className="text-3xl font-bold text-green-600 mb-4">How many {items[0]?.char}s are in the garden?</h2>
      <div className="flex-1 relative bg-green-50 rounded-3xl border-8 border-green-100 mb-8 overflow-hidden">
        {items.map((item, i) => (
          <div 
            key={i} 
            className="absolute text-6xl animate-pulse" 
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          >
            {item.char}
          </div>
        ))}
      </div>
      
      {message && <div className="text-2xl font-bold text-orange-500 mb-4">{message}</div>}

      <div className="flex justify-center gap-4 flex-wrap">
        {[target - 1, target, target + 1, target + 2].sort(() => 0.5 - Math.random()).map(num => (
          num > 0 && (
            <button
              key={num}
              onClick={() => checkAnswer(num)}
              className="w-20 h-20 text-3xl font-bold bg-white rounded-2xl kids-button-shadow text-green-600 border-4 border-green-100 hover:scale-110"
            >
              {num}
            </button>
          )
        ))}
      </div>
    </div>
  );
};
