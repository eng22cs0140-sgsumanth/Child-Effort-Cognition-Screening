
import React, { useState } from 'react';
import { GAMES } from '../constants';
import { GameType, ChildProfile, GameResult } from '../types';
import { ReactionCatcher } from './ReactionCatcher';
import { PatternMemory } from './PatternMemory';
import { EmotionDetective } from './EmotionDetective';
import { NumberSequencer } from './NumberSequencer';
import { CountingGarden } from './CountingGarden';
import { SoundWordGame } from './SoundWordGame';
import { FollowLeader } from './FollowLeader';
import { SimonSays } from './SimonSays';
import { ColorMaze } from './ColorMaze';
import { CategorySort } from './CategorySort';

interface Props {
  profile: ChildProfile;
  onGameComplete: (result: GameResult) => void;
}

export const AssessmentPage: React.FC<Props> = ({ profile, onGameComplete }) => {
  const [activeGame, setActiveGame] = useState<GameType | null>(null);

  const handleGameEnd = (data: any) => {
    if (activeGame) {
      onGameComplete({
        gameId: activeGame,
        score: data.score || 0,
        data,
        timestamp: Date.now()
      });
      setActiveGame(null);
    }
  };

  const renderActiveGame = () => {
    switch (activeGame) {
      case 'catcher': return <ReactionCatcher profile={profile} onComplete={handleGameEnd} />;
      case 'memory': return <PatternMemory profile={profile} onComplete={handleGameEnd} />;
      case 'emotion': return <EmotionDetective profile={profile} onComplete={handleGameEnd} />;
      case 'numbersequencer': return <NumberSequencer profile={profile} onComplete={handleGameEnd} />;
      case 'counting': return <CountingGarden profile={profile} onComplete={handleGameEnd} />;
      case 'sound': return <SoundWordGame profile={profile} onComplete={handleGameEnd} />;
      case 'leader': return <FollowLeader profile={profile} onComplete={handleGameEnd} />;
      case 'simon': return <SimonSays profile={profile} onComplete={handleGameEnd} />;
      case 'maze': return <ColorMaze profile={profile} onComplete={handleGameEnd} />;
      case 'category': return <CategorySort profile={profile} onComplete={handleGameEnd} />;
      default: return null;
    }
  };

  if (activeGame) {
    return (
      <div className="container mx-auto px-4 py-4 h-[calc(100vh-100px)] animate-pop-in flex flex-col">
        <button
          onClick={() => setActiveGame(null)}
          className="mb-4 text-purple-600 font-black flex items-center gap-2 hover:scale-105 transition-all text-xl group"
        >
          <span className="bg-white w-10 h-10 rounded-full flex items-center justify-center kids-shadow group-hover:bg-purple-100 transition-colors">←</span>
          <span>Pick Another Adventure</span>
        </button>
        <div className="flex-1 bg-white rounded-[3rem] kids-shadow p-6 md:p-8 border-4 border-purple-50 overflow-y-auto relative shadow-2xl">
           {renderActiveGame()}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="text-center mb-24 animate-pop-in">
        <h1 className="text-7xl font-black text-purple-700 mb-6 tracking-tight">
          Hey, <span className="text-orange-500">{profile.name}!</span> 👋
        </h1>
        <p className="text-3xl text-purple-400 font-bold">Pick a game and collect your badge!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 max-w-7xl mx-auto perspective-container">
        {GAMES.map((game, i) => (
          <button
            key={game.id}
            onClick={() => setActiveGame(game.id)}
            className="group animate-pop-in relative bg-white p-12 rounded-[5rem] kids-shadow text-center tilt-card border-4 border-purple-50 hover:border-purple-200 flex flex-col items-center justify-between min-h-[500px]"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            {/* The Rotating Kinetic Icon */}
            <div className="text-9xl mb-10 rotate-360 drop-shadow-xl transition-all duration-700 ease-in-out">
              {game.icon}
            </div>

            <div className="flex-1">
              <h3 className="text-4xl font-black text-purple-700 mb-4 tracking-tight">{game.title}</h3>
              <p className="text-gray-400 font-bold text-xl mb-8 leading-relaxed">{game.description}</p>
            </div>

            <div className="w-full">
              <div className="mb-6">
                <span className="bg-purple-100 text-purple-600 px-10 py-4 rounded-[2rem] font-black text-xl group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                  {game.badge}
                </span>
              </div>
              <div className="text-sm font-black text-gray-300 tracking-widest uppercase">
                Ages {game.ageRange[0]} - {game.ageRange[1]}
              </div>
            </div>

            {/* Hover Shine Effect */}
            <div className="absolute inset-0 rounded-[5rem] overflow-hidden pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity">
               <div className="absolute inset-0 bg-gradient-to-tr from-white via-transparent to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
