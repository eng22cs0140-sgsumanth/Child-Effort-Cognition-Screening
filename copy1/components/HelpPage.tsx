
import React from 'react';

export const HelpPage: React.FC = () => {
  return (
    <div className="bg-[#FFF9E6] text-gray-800 min-h-screen p-8 md:p-16">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white p-12 rounded-[3rem] kids-shadow border-4 border-purple-100 mb-12 text-center">
          <h1 className="text-4xl font-bold mb-6 text-purple-600">About Developmental Screening</h1>
          <p className="text-gray-500 text-xl max-w-3xl mx-auto leading-relaxed">
            Developmental screening is a joyful part of well-child care! It helps identify how your child is growing, making sure they get the right support early on.
          </p>
        </div>

        <h2 className="text-3xl font-bold mb-8 text-purple-600 text-center">Age-Appropriate Milestones</h2>
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white p-8 rounded-3xl kids-shadow border-t-8 border-blue-400">
            <h3 className="text-2xl font-bold mb-6 text-blue-500 flex items-center gap-2">
              <span>👶</span> Ages 0-3
            </h3>
            <ul className="space-y-4 text-gray-600 text-lg">
              <li className="flex items-center gap-2">✨ Sits without support</li>
              <li className="flex items-center gap-2">✨ Imitates simple sounds</li>
              <li className="flex items-center gap-2">✨ Follows moving objects</li>
              <li className="flex items-center gap-2">✨ Explores toys with hands</li>
            </ul>
          </div>
          <div className="bg-white p-8 rounded-3xl kids-shadow border-t-8 border-purple-400">
            <h3 className="text-2xl font-bold mb-6 text-purple-500 flex items-center gap-2">
              <span>🏃</span> Ages 4-9
            </h3>
            <ul className="space-y-4 text-gray-600 text-lg">
              <li className="flex items-center gap-2">✨ Hops and jumps confidently</li>
              <li className="flex items-center gap-2">✨ Solves simple puzzles</li>
              <li className="flex items-center gap-2">✨ Understands rules of games</li>
              <li className="flex items-center gap-2">✨ Expresses complex emotions</li>
            </ul>
          </div>
        </div>

        <h2 className="text-3xl font-bold mb-8 text-orange-500 text-center">When to Seek Support</h2>
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-orange-50 p-8 rounded-3xl kids-shadow border-l-8 border-orange-400">
            <h3 className="text-2xl font-bold mb-6 text-orange-600">Attention & Language</h3>
            <ul className="space-y-4 text-gray-600 text-lg">
              <li>• Difficulty focusing on tasks</li>
              <li>• Delayed speech or vocabulary</li>
              <li>• Trouble following instructions</li>
            </ul>
          </div>
          <div className="bg-orange-50 p-8 rounded-3xl kids-shadow border-l-8 border-orange-400">
            <h3 className="text-2xl font-bold mb-6 text-orange-600">Cognitive & Social</h3>
            <ul className="space-y-4 text-gray-600 text-lg">
              <li>• Challenges with memory</li>
              <li>• Problem-solving delays</li>
              <li>• Social interaction avoidance</li>
            </ul>
          </div>
        </div>

        <h2 className="text-3xl font-bold mb-8 text-green-600 text-center">Professional Resources</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl kids-shadow border-b-4 border-green-200">
            <h4 className="font-bold text-xl mb-2 text-green-700">Pediatric Specialist</h4>
            <p className="text-gray-500">Early assessment for developmental growth</p>
          </div>
          <div className="bg-white p-6 rounded-2xl kids-shadow border-b-4 border-green-200">
            <h4 className="font-bold text-xl mb-2 text-green-700">Early Learning</h4>
            <p className="text-gray-500">Support services for children 0-5 years</p>
          </div>
          <div className="bg-white p-6 rounded-2xl kids-shadow border-b-4 border-green-200">
            <h4 className="font-bold text-xl mb-2 text-green-700">Language Support</h4>
            <p className="text-gray-500">Communication and vocabulary development</p>
          </div>
        </div>
      </div>
    </div>
  );
};
