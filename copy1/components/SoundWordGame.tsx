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
  const [roundData, setRoundData] = useState<{ target: typeof ITEMS[0], options: typeof ITEMS } | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const target = ITEMS[currentIdx];
    const others = ITEMS.filter((_, i) => i !== currentIdx).sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [...others, target].sort(() => 0.5 - Math.random());
    setRoundData({ target, options });
  }, [currentIdx]);

  const handleSelect = (item: typeof ITEMS[0]) => {
    if (isProcessing || !roundData) return;
    setIsProcessing(true);

    const isCorrect = item.animal === roundData.target.animal;
    const newScore = isCorrect ? score + 1 : score;

    if (isCorrect) {
      setScore(newScore);
      setFeedback('Correct! Well done! 🌟');
    } else {
      setFeedback(`Not quite! That was a ${item.animal}.`);
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

  if (!roundData) return null;

  return (
    <div className="flex flex-col h-full text-center max-w-2xl mx-auto px-4">
      <div className="mb-4">
        <h2 className="text-2xl md:text-3xl font-black text-purple-700 mb-2 tracking-tight">Who says "{roundData.target.sound}"?</h2>
        <div className="w-full bg-purple-100 h-3 rounded-full overflow-hidden">
          <div
            className="bg-purple-500 h-full transition-all duration-500"
            style={{ width: `${(currentIdx / ITEMS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-[2.5rem] kids-shadow border-2 border-purple-50 flex flex-col gap-4 flex-1 justify-center items-center">
        <div className="text-5xl md:text-6xl p-4 bg-purple-50 rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center animate-pulse border-2 border-white shadow-inner">
          📢
        </div>

        <div className="h-8 flex items-center justify-center">
          {feedback && (
            <p className={`text-lg md:text-xl font-black animate-pop-in ${feedback.includes('Correct') ? 'text-green-500' : 'text-orange-500'}`}>
              {feedback}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {roundData.options.map((item, i) => (
            <button
              key={i}
              disabled={isProcessing}
              onClick={() => handleSelect(item)}
              className="p-4 bg-orange-50 hover:bg-orange-500 hover:text-white rounded-[1.5rem] kids-button-shadow flex flex-col items-center gap-1 border-2 border-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <span className="text-5xl md:text-6xl">{item.icon}</span>
              <span className="text-sm font-black uppercase tracking-wide">{item.animal}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="text-purple-400 font-black text-base italic mt-3">Listening like a pro! 👂✨</p>
    </div>
  );
};
