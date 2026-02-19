
import React, { useState, useEffect } from 'react';
import { ChildProfile } from '../types';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const ACTIONS = [
  { name: 'Jump', icon: '🏃‍♂️', sound: 'Hop!' },
  { name: 'Clap', icon: '👏', sound: 'Pop!' },
  { name: 'Spin', icon: '🌀', sound: 'Woo!' },
  { name: 'Wave', icon: '👋', sound: 'Hey!' }
];

export const FollowLeader: React.FC<Props> = ({ profile, onComplete }) => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [isShowing, setIsShowing] = useState(false);
  const [activeAction, setActiveAction] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [message, setMessage] = useState('Watch Starry dance!');

  const maxRounds = 4;

  const startRound = () => {
    const len = round + 1;
    const nextSeq = Array.from({ length: len }, () => Math.floor(Math.random() * ACTIONS.length));
    setSequence(nextSeq);
    setUserSequence([]);
    setIsShowing(true);
    setMessage('Watch carefully...');
    
    let i = 0;
    const interval = setInterval(() => {
      if (i >= nextSeq.length) {
        clearInterval(interval);
        setIsShowing(false);
        setActiveAction(null);
        setMessage('Your turn! Copy the moves!');
        return;
      }
      setActiveAction(nextSeq[i]);
      i++;
    }, 1000);
  };

  useEffect(() => {
    setTimeout(startRound, 1000);
  }, [round]);

  const handleAction = (idx: number) => {
    if (isShowing) return;
    const nextUserSeq = [...userSequence, idx];
    setUserSequence(nextUserSeq);

    if (idx !== sequence[userSequence.length]) {
      setMessage('Oh no! Let\'s try the round again!');
      setTimeout(startRound, 1500);
      return;
    }

    if (nextUserSeq.length === sequence.length) {
      if (round >= maxRounds) {
        onComplete({ score: round * 100, rounds: round });
      } else {
        setMessage('Great dancing! 🕺');
        setTimeout(() => setRound(r => r + 1), 1000);
      }
    }
  };

  return (
    <div className="flex flex-col h-full text-center max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-blue-600 mb-2">Follow the Leader</h2>
        <div className="bg-white px-6 py-2 rounded-full inline-block kids-shadow font-bold text-gray-500">Round {round}/{maxRounds}</div>
      </div>
      
      <div className="bg-white p-8 rounded-[3rem] kids-shadow flex-1 flex flex-col gap-8 justify-center items-center">
        <div className="text-9xl h-48 flex items-center justify-center transition-all">
          {activeAction !== null ? ACTIONS[activeAction].icon : '✨'}
        </div>
        <p className="text-2xl font-bold text-purple-600">{message}</p>
        
        <div className="grid grid-cols-2 gap-4 w-full">
          {ACTIONS.map((action, i) => (
            <button
              key={i}
              disabled={isShowing}
              onClick={() => handleAction(i)}
              className={`p-6 rounded-3xl kids-button-shadow transition-all border-4 flex flex-col items-center
                ${isShowing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                ${i === 0 ? 'bg-red-50 border-red-100' : i === 1 ? 'bg-blue-50 border-blue-100' : i === 2 ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}
              `}
            >
              <span className="text-5xl mb-2">{action.icon}</span>
              <span className="font-bold text-gray-600">{action.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
