
import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// Each action shows for this long, then goes blank before the next one
const ACTION_DISPLAY_MS = 1500;
const GAP_BETWEEN_MS  = 500;
const STEP_MS = ACTION_DISPLAY_MS + GAP_BETWEEN_MS;

export const FollowLeader: React.FC<Props> = ({ profile, onComplete }) => {
  const [sequence, setSequence]         = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [isShowing, setIsShowing]       = useState(false);
  const [activeAction, setActiveAction] = useState<number | null>(null);
  const [round, setRound]               = useState(1);
  const [message, setMessage]           = useState('Watch Starry dance!');
  const [isGameStarted, setIsGameStarted] = useState(false);
  // Blocks input during celebrations / retry delays
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Refs give async callbacks the latest values without stale closures
  const sequenceRef      = useRef<number[]>([]);
  const userSequenceRef  = useRef<number[]>([]);
  const transitioningRef = useRef(false);
  // Track all scheduled timeouts so we can cancel them on unmount / round restart
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  const maxRounds = 4;

  const clearAllTimeouts = () => {
    timeoutIds.current.forEach(clearTimeout);
    timeoutIds.current = [];
  };

  const schedule = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutIds.current.push(id);
    return id;
  };

  const startRound = useCallback((currentRound: number) => {
    clearAllTimeouts();

    const len = currentRound + 1;
    const nextSeq = Array.from({ length: len }, () =>
      Math.floor(Math.random() * ACTIONS.length)
    );

    // Update ref immediately — state is for rendering only
    sequenceRef.current   = nextSeq;
    userSequenceRef.current = [];
    transitioningRef.current = false;

    setSequence(nextSeq);
    setUserSequence([]);
    setIsTransitioning(false);
    setIsShowing(true);
    setActiveAction(null);
    setMessage('Watch carefully…');

    // Show each action with a visible gap so repeated moves are distinguishable
    nextSeq.forEach((actionIdx, i) => {
      schedule(() => setActiveAction(actionIdx), i * STEP_MS);
      schedule(() => setActiveAction(null),      i * STEP_MS + ACTION_DISPLAY_MS);
    });

    // Enable player input after the full sequence has played
    schedule(() => {
      setIsShowing(false);
      setMessage('Your turn! Copy the moves!');
    }, nextSeq.length * STEP_MS);
  }, []);

  // Re-run startRound whenever the round counter increments
  useEffect(() => {
    if (!isGameStarted) return;
    const id = setTimeout(() => startRound(round), 800);
    return () => {
      clearTimeout(id);
      clearAllTimeouts();
    };
  }, [round, isGameStarted, startRound]);

  // Clean up on unmount
  useEffect(() => () => clearAllTimeouts(), []);

  const handleAction = (idx: number) => {
    // Block if sequence is playing, game hasn't started, or in a transition delay
    if (isShowing || !isGameStarted || transitioningRef.current) return;

    // Use refs for guaranteed up-to-date values
    const currentSeq     = sequenceRef.current;
    const currentUserSeq = userSequenceRef.current;
    const expected       = currentSeq[currentUserSeq.length];
    const nextUserSeq    = [...currentUserSeq, idx];

    userSequenceRef.current = nextUserSeq;
    setUserSequence(nextUserSeq);

    // Brief visual flash on the pressed button
    setActiveAction(idx);
    schedule(() => setActiveAction(null), 300);

    if (idx !== expected) {
      // Wrong move — lock input then restart the round
      transitioningRef.current = true;
      setIsTransitioning(true);
      setMessage("Oh no! Let's try the round again! 🔄");
      schedule(() => startRound(round), 1600);
      return;
    }

    if (nextUserSeq.length === currentSeq.length) {
      // Completed the sequence for this round
      transitioningRef.current = true;
      setIsTransitioning(true);

      if (round >= maxRounds) {
        setMessage('You are a dance star! 🌟');
        schedule(() => onComplete({ score: round * 25, rounds: round }), 1500);
      } else {
        setMessage('Great dancing! 🕺');
        schedule(() => setRound(r => r + 1), 1500);
      }
    }
  };

  if (!isGameStarted) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center max-w-4xl mx-auto px-4">
        <h2 className="text-6xl font-black text-blue-600 mb-8">Follow the Leader</h2>
        <div className="bg-white p-16 rounded-[5rem] kids-shadow border-8 border-blue-50 flex flex-col items-center gap-10">
          <div className="text-[15rem] animate-float">🕺</div>
          <p className="text-3xl font-bold text-gray-600 max-w-xl">
            Watch Starry's moves and then copy them exactly! Ready to dance?
          </p>
          <button
            onClick={() => setIsGameStarted(true)}
            className="bg-blue-500 hover:bg-blue-400 text-white px-20 py-10 rounded-[3rem] kids-button-shadow font-black text-4xl transition-all hover:scale-110 active:scale-95"
          >
            START DANCING! 🚀
          </button>
        </div>
      </div>
    );
  }

  const inputDisabled = isShowing || isTransitioning;

  return (
    <div className="flex flex-col h-full text-center max-w-5xl mx-auto px-4">
      <div className="mb-8 flex justify-between items-end">
        <div className="text-left">
          <h2 className="text-5xl font-black text-blue-600 mb-2 tracking-tight">Follow the Leader</h2>
          <p className="text-2xl font-bold text-gray-400">Round {round} of {maxRounds}</p>
        </div>
        <div className="flex gap-2 mb-2">
          {[...Array(maxRounds)].map((_, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
                i < round ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-300'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 md:p-10 rounded-[3rem] kids-shadow border-4 border-blue-50 flex-1 flex flex-col gap-6 justify-center items-center relative overflow-hidden">
        {isShowing && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-white px-6 py-2 rounded-full font-black text-lg animate-pulse">
            WATCH! 👀
          </div>
        )}

        <div
          className={`text-8xl md:text-9xl h-48 flex items-center justify-center transition-all duration-300 ${
            activeAction !== null ? 'scale-110 drop-shadow-xl' : 'scale-100 opacity-50'
          }`}
        >
          {activeAction !== null ? ACTIONS[activeAction].icon : ''}
        </div>

        <div className="bg-blue-50 px-6 py-3 rounded-[1.5rem] border-2 border-dashed border-blue-200">
          <p className="text-2xl font-black text-purple-600">{message}</p>
        </div>

        {/* Progress dots during player's turn */}
        {!isShowing && !isTransitioning && userSequence.length > 0 && (
          <div className="flex gap-2">
            {sequenceRef.current.map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all ${
                  i < userSequence.length ? 'bg-blue-500' : 'bg-blue-100'
                }`}
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          {ACTIONS.map((action, i) => (
            <button
              key={i}
              disabled={inputDisabled}
              onClick={() => handleAction(i)}
              className={`p-4 rounded-[1.5rem] kids-button-shadow transition-all border-2 flex flex-col items-center justify-center gap-1
                ${inputDisabled
                  ? 'opacity-50 grayscale cursor-not-allowed'
                  : 'hover:scale-105 active:scale-90'}
                ${i === 0 ? 'bg-red-50 border-red-200 text-red-600'
                  : i === 1 ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : i === 2 ? 'bg-green-50 border-green-200 text-green-600'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-600'}
              `}
            >
              <span className="text-4xl">{action.icon}</span>
              <span className="font-black text-sm uppercase tracking-wider">{action.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
