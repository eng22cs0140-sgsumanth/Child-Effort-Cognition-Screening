
import React, { useState } from 'react';
import { Observation } from '../types';

interface Props {
  observations: Observation[];
  onAdd: (text: string) => void;
  onClose: () => void;
  isOpen: boolean;
  childName: string;
}

export const ObservationsDiary: React.FC<Props> = ({ observations, onAdd, onClose, isOpen, childName }) => {
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onAdd(inputText);
      setInputText('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-purple-900/40 backdrop-blur-sm animate-pop-in">
      <div className="relative w-full max-w-2xl h-[80vh] bg-[#fdfdfd] rounded-xl kids-shadow border-l-[30px] border-orange-400 overflow-hidden flex flex-col">
        {/* Spiral Binding Effect */}
        <div className="absolute left-[-20px] top-0 bottom-0 w-8 flex flex-col justify-around py-4 z-10">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-10 h-4 bg-gray-300 rounded-full border-2 border-gray-400 shadow-sm"></div>
          ))}
        </div>

        {/* Header */}
        <div className="p-8 border-b-2 border-red-100 flex justify-between items-center bg-[#fdfdfd]">
          <div>
            <h2 className="text-3xl font-black text-purple-700 tracking-tight">Parent's Diary 📒</h2>
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-1">Notes about {childName || 'Child'}</p>
          </div>
          <button onClick={onClose} className="text-4xl hover:scale-125 transition-transform text-gray-300">✕</button>
        </div>

        {/* Notebook Body with Lined Paper Effect */}
        <div className="flex-1 overflow-y-auto p-12 relative bg-[linear-gradient(#e1e9ff_1px,transparent_1px)] bg-[size:100%_2.5rem] leading-[2.5rem]">
          <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-red-200"></div>
          
          <div className="space-y-10 pl-4">
            {observations.length === 0 ? (
              <p className="text-gray-400 italic font-bold py-2">No notes yet. Write down what you notice about {childName || 'your child'} today...</p>
            ) : (
              observations.map((obs) => (
                <div key={obs.id} className="relative group">
                  <div className="text-xs text-purple-300 font-black absolute -top-5 left-0">
                    {new Date(obs.timestamp).toLocaleDateString()} @ {new Date(obs.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <p className="text-gray-700 font-bold text-lg min-h-[2.5rem]">{obs.text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSubmit} className="p-8 bg-gray-50 border-t-2 border-red-50 flex gap-4">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a new observation..."
            className="flex-1 p-5 rounded-2xl bg-white border-2 border-gray-200 focus:border-purple-300 outline-none font-bold text-gray-700 shadow-inner"
          />
          <button 
            type="submit"
            className="bg-orange-400 text-white px-8 rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all kids-button-shadow"
          >
            WRITE ✍️
          </button>
        </form>
      </div>
    </div>
  );
};
