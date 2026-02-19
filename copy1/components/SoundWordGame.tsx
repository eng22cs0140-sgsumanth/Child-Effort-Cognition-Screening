
import React, { useState, useEffect } from 'react';
import { ChildProfile } from '../types';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const ITEMS = [
  { sound: 'Moo!', animal: 'Cow', icon: '🐮' },
  { sound: 'Woof!', animal: 'Dog', icon: '🐶' },
  { sound: 'Meow!', animal: 'Cat', icon: '🐱' },
  { sound: 'Oink!', animal: 'Pig', icon: '🐷' },
  { sound: 'Roar!', animal: 'Lion', icon: '🦁' },
  { sound: 'Tweet!', animal: 'Bird', icon: '🐦' }
];

export const SoundWordGame: React.FC<Props> = ({ profile, onComplete }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [options, setOptions] = useState<typeof ITEMS>([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');

  const target = ITEMS[currentIdx];

  useEffect(() => {
    const others = ITEMS.filter((_, i) => i !== currentIdx).sort(() => 0.5 - Math.random()).slice(0, 3);
    setOptions([...others, target].sort(() => 0.5 - Math.random()));
  }, [currentIdx]);

  const handleSelect = (item: typeof ITEMS[0]) => {
    if (item.animal === target.animal) {
      setScore(s => s + 1);
      setFeedback('Correct! Well done! 🌟');
      setTimeout(() => {
        setFeedback('');
        if (currentIdx + 1 < ITEMS.length) {
          setCurrentIdx(i => i + 1);
        } else {
          onComplete({ score: score + 1, total: ITEMS.length });
        }
      }, 1500);
    } else {
      setFeedback('Not that one, try again!');
    }
  };

  return (
    <div className="flex flex-col h-full text-center max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-purple-600 mb-8">Which animal says "{target.sound}"?</h2>
      <div className="bg-white p-12 rounded-[3rem] kids-shadow flex flex-col gap-8 flex-1">
        <div className="text-8xl p-8 bg-purple-50 rounded-full w-48 h-48 flex items-center justify-center mx-auto animate-pulse">
          📢
        </div>
        {feedback && <p className={`text-2xl font-bold ${feedback.includes('Correct') ? 'text-green-500' : 'text-orange-500'}`}>{feedback}</p>}
        <div className="grid grid-cols-2 gap-6">
          {options.map((item, i) => (
            <button
              key={i}
              onClick={() => handleSelect(item)}
              className="p-6 bg-orange-50 hover:bg-orange-100 rounded-3xl kids-button-shadow flex flex-col items-center gap-2 border-2 border-orange-100"
            >
              <span className="text-6xl">{item.icon}</span>
              <span className="text-xl font-bold text-orange-600">{item.animal}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
