
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
  { text: "Clap your hands!", icon: "👏", requiresSimon: false }
];

export const SimonSays: React.FC<Props> = ({ profile, onComplete }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [rounds, setRounds] = useState(0);

  const command = COMMANDS[currentIdx];

  const handleDecision = (doAction: boolean) => {
    const isCorrect = doAction === command.requiresSimon;
    if (isCorrect) {
      setScore(s => s + 20);
      setFeedback('You listened well! ✅');
    } else {
      setFeedback('Simon didn\'t say! ❌');
    }

    setTimeout(() => {
      setFeedback('');
      setRounds(r => r + 1);
      if (rounds + 1 >= 5) {
        onComplete({ score: Math.max(0, score + (isCorrect ? 20 : 0)), rounds: 5 });
      } else {
        setCurrentIdx(Math.floor(Math.random() * COMMANDS.length));
      }
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full text-center max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-red-500 mb-8">Simon Says Musical</h2>
      <div className="bg-white p-12 rounded-[3rem] kids-shadow flex flex-col gap-8 flex-1 justify-center">
        <div className="text-9xl mb-4 animate-bounce">🎶</div>
        <div className="text-4xl font-black text-purple-700 leading-tight h-32 flex items-center justify-center">
          "{command.text}"
        </div>
        
        {feedback && <p className={`text-2xl font-bold ${feedback.includes('Correct') || feedback.includes('listened') ? 'text-green-500' : 'text-red-500'}`}>{feedback}</p>}
        
        <div className="flex gap-6 mt-8">
          <button 
            onClick={() => handleDecision(true)}
            className="flex-1 bg-green-500 text-white py-6 rounded-3xl kids-button-shadow font-bold text-2xl"
          >
            Do It! 👍
          </button>
          <button 
            onClick={() => handleDecision(false)}
            className="flex-1 bg-red-500 text-white py-6 rounded-3xl kids-button-shadow font-bold text-2xl"
          >
            Don't Do It! 🛑
          </button>
        </div>
        <p className="text-gray-400 font-medium italic mt-4">Listen carefully! Only do it if Starry says "Simon says"!</p>
      </div>
    </div>
  );
};
