
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
    if (emotion.name === targetEmotion.name) {
      setScore(s => s + 1);
      setFeedback('You nailed it! 🕵️✨');
      setTimeout(() => {
        setFeedback('');
        if (currentIdx + 1 < EMOTIONS.length) {
          setCurrentIdx(i => i + 1);
        } else {
          onComplete({ score: score + 1, total: EMOTIONS.length });
        }
      }, 1500);
    } else {
      setFeedback('Not quite... look closer!');
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto text-center">
      <h2 className="text-4xl font-black text-purple-700 mb-8 tracking-tight">How is Starry feeling right now?</h2>
      
      <div className="flex-1 flex flex-col items-center justify-center gap-10 bg-purple-50/50 p-12 rounded-[4rem] border-4 border-dashed border-purple-200 mb-10 overflow-hidden">
        <div key={targetEmotion.emoji} className="text-[14rem] drop-shadow-2xl">
          {targetEmotion.emoji}
        </div>
        
        <div className="h-12 flex items-center justify-center">
          {feedback && (
            <div className={`text-3xl font-black ${feedback.includes('nailed') ? 'text-green-500' : 'text-orange-500'}`}>
              {feedback}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
          {options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleSelect(option)}
              className="p-8 bg-white hover:bg-purple-600 hover:text-white text-purple-700 font-black text-3xl rounded-[2.5rem] kids-button-shadow transition-all hover:scale-105 active:scale-90 border-4 border-white"
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>
      <p className="text-gray-400 font-bold text-xl italic">Becoming a feeling expert! 🌈</p>
    </div>
  );
};
