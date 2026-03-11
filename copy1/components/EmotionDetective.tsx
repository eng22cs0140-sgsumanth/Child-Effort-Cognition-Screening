
import React, { useState } from 'react';
import { ChildProfile } from '../types';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const EMOTIONS = [
  { name: 'Happy', emoji: '😊', description: 'Everything is great!' },
  { name: 'Sad', emoji: '😢', description: 'I am feeling a bit blue.' },
  { name: 'Angry', emoji: '😠', description: 'Grrr, I am upset!' },
  { name: 'Surprised', emoji: '😲', description: 'Wow! I didn\'t expect that!' },
  { name: 'Scared', emoji: '😨', description: 'Oh no, this is spooky!' },
  { name: 'Thinking', emoji: '🤔', description: 'Hmm, let me see...' }
];

export const EmotionDetective: React.FC<Props> = ({ profile, onComplete }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState<typeof EMOTIONS>([]);
  const [feedback, setFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const targetEmotion = EMOTIONS[currentIdx];

  const generateOptions = () => {
    const others = EMOTIONS.filter((_, i) => i !== currentIdx);
    const shuffled = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
    return [...shuffled, targetEmotion].sort(() => 0.5 - Math.random());
  };

  React.useEffect(() => {
    setOptions(generateOptions());
  }, [currentIdx]);

  const handleSelect = (emotion: typeof EMOTIONS[0]) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const isCorrect = emotion.name === targetEmotion.name;
    const newScore = isCorrect ? score + 1 : score;

    if (isCorrect) {
      setScore(newScore);
      setFeedback('You nailed it! 🕵️✨');
    } else {
      setFeedback('Not quite... look closer! 🧐');
    }

    setTimeout(() => {
      setFeedback('');
      setIsProcessing(false);
      if (currentIdx + 1 < EMOTIONS.length) {
        setCurrentIdx(i => i + 1);
      } else {
        onComplete({ score: Math.round((newScore / EMOTIONS.length) * 100), total: EMOTIONS.length });
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto text-center px-4">
      <div className="mb-4">
        <h2 className="text-3xl md:text-4xl font-black text-purple-700 mb-2 tracking-tight">How is Starry feeling?</h2>
        <div className="w-full bg-purple-100 h-3 rounded-full overflow-hidden kids-shadow">
          <div
            className="bg-purple-500 h-full transition-all duration-500"
            style={{ width: `${((currentIdx) / EMOTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white p-4 md:p-6 rounded-[2.5rem] kids-shadow border-2 border-purple-100 mb-4 relative overflow-hidden">
        <div className="absolute top-3 right-5 text-base font-black text-purple-300">
          {currentIdx + 1} / {EMOTIONS.length}
        </div>

        <div key={targetEmotion.emoji} className="text-6xl md:text-7xl drop-shadow-lg animate-float">
          {targetEmotion.emoji}
        </div>

        <div className="h-8 flex items-center justify-center">
          {feedback && (
            <div className={`text-xl md:text-2xl font-black animate-pop-in ${feedback.includes('nailed') ? 'text-green-500' : 'text-orange-500'}`}>
              {feedback}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {options.map((option, i) => (
            <button
              key={i}
              disabled={isProcessing}
              onClick={() => handleSelect(option)}
              className="p-3 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 font-black text-lg md:text-xl rounded-[1.5rem] kids-button-shadow transition-all hover:scale-105 active:scale-90 border-2 border-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>
      <p className="text-purple-400 font-black text-base italic">You're becoming a feeling expert! 🌈</p>
    </div>
  );
};
