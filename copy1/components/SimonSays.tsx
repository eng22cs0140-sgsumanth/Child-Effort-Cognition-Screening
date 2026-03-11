
import React, { useState, useEffect } from 'react';
import { ChildProfile } from '../types';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const COMMANDS = [
  { text: "Simon says, Touch your nose!", icon: "👃", requiresSimon: true },
  { text: "Simon says, Raise your hand!", icon: "✋", requiresSimon: true },
  { text: "Touch your ears!", icon: "👂", requiresSimon: false },
  { text: "Simon says, Stick out your tongue!", icon: "👅", requiresSimon: true },
  { text: "Clap your hands!", icon: "👏", requiresSimon: false },
  { text: "Simon says, Close your eyes!", icon: "🙈", requiresSimon: true },
  { text: "Jump up high!", icon: "🚀", requiresSimon: false },
  { text: "Simon says, Pat your head!", icon: "💆", requiresSimon: true }
];

export const SimonSays: React.FC<Props> = ({ profile, onComplete }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [rounds, setRounds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const command = COMMANDS[currentIdx];

  const handleDecision = (doAction: boolean) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const isCorrect = doAction === command.requiresSimon;
    const points = isCorrect ? 20 : 0;
    const newScore = score + points;

    if (isCorrect) {
      setScore(newScore);
      setFeedback('You listened well! ✅');
    } else {
      setFeedback('Simon didn\'t say! ❌');
    }

    setTimeout(() => {
      setFeedback('');
      setIsProcessing(false);
      const nextRounds = rounds + 1;
      setRounds(nextRounds);

      if (nextRounds >= 5) {
        onComplete({ score: newScore, rounds: 5 });
      } else {
        // Pick a different command than the current one
        let nextIdx;
        do {
          nextIdx = Math.floor(Math.random() * COMMANDS.length);
        } while (nextIdx === currentIdx);
        setCurrentIdx(nextIdx);
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full text-center max-w-2xl mx-auto px-4">
      <div className="mb-4">
        <h2 className="text-3xl md:text-4xl font-black text-red-500 mb-2 tracking-tight">Simon Says Musical</h2>
        <div className="flex justify-center gap-1.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-10 h-3 rounded-full ${i < rounds ? 'bg-red-500' : 'bg-red-100'} transition-colors`}
            />
          ))}
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-[2.5rem] kids-shadow border-2 border-red-50 flex flex-col gap-4 flex-1 justify-center items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10 flex flex-wrap justify-around p-4">
          {['🎶', '🎵', '🎼'].map((note, i) => (
            <div key={i} className="text-3xl animate-float" style={{ animationDelay: `${i * 0.5}s` }}>{note}</div>
          ))}
        </div>

        <div className="text-6xl md:text-7xl mb-1 animate-bounce drop-shadow-lg">
          {command.icon}
        </div>

        <div className="bg-red-50 p-4 rounded-[1.5rem] w-full border-2 border-dashed border-red-200">
          <div className="text-xl md:text-2xl font-black text-purple-700 leading-tight min-h-[4rem] flex items-center justify-center">
            "{command.text}"
          </div>
        </div>

        <div className="h-8 flex items-center justify-center">
          {feedback && (
            <p className={`text-xl font-black animate-pop-in ${feedback.includes('listened') ? 'text-green-500' : 'text-red-500'}`}>
              {feedback}
            </p>
          )}
        </div>

        <div className="flex gap-3 w-full max-w-md">
          <button
            disabled={isProcessing}
            onClick={() => handleDecision(true)}
            className="flex-1 bg-green-500 hover:bg-green-400 text-white py-4 rounded-[1.5rem] kids-button-shadow font-black text-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            Do It! 👍
          </button>
          <button
            disabled={isProcessing}
            onClick={() => handleDecision(false)}
            className="flex-1 bg-red-500 hover:bg-red-400 text-white py-4 rounded-[1.5rem] kids-button-shadow font-black text-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            Wait! 🛑
          </button>
        </div>
        <p className="text-gray-400 font-black text-base italic mt-1">Only do it if Starry says "Simon says"!</p>
      </div>
    </div>
  );
};
