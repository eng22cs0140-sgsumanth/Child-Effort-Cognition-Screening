
import React, { useState, useEffect } from 'react';
import { Section, ChildProfile, ParentProfile, GameResult, UserRole, Observation } from './types';
import { AssessmentPage } from './components/AssessmentPage';
import { HelpPage } from './components/HelpPage';
import { ObservationsDiary } from './components/ObservationsDiary';
import { calculateCECI } from './ceciAlgorithm';
import { useCECICalculation } from './hooks/useCECICalculation';

const App: React.FC = () => {
  const [section, setSection] = useState<Section>('welcome');
  const [history, setHistory] = useState<Section[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isDiaryOpen, setIsDiaryOpen] = useState(false);
  
  const [parent, setParent] = useState<ParentProfile>({ 
    name: '', 
    email: '', 
    relationship: '' 
  });
  
  const [child, setChild] = useState<ChildProfile>({ 
    name: '', 
    dob: '', 
    age: 0, 
    bloodGroup: '', 
    height: 0, 
    weight: 0, 
    bmi: 0, 
    conditions: '',
    observations: []
  });
  
  const [results, setResults] = useState<GameResult[]>([]);

  // Navigation with history
  const navigateTo = (newSection: Section) => {
    if (newSection !== section) {
      setHistory(prev => [...prev, section]);
      setSection(newSection);
    }
  };

  const goBack = () => {
    if (history.length > 0) {
      const prevSection = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setSection(prevSection);
    } else {
      setSection('welcome');
      setRole(null);
    }
  };

  const handleGameComplete = (result: GameResult) => {
    // Add session number based on game history
    const gameSessionNumber = results.filter(r => r.gameId === result.gameId).length + 1;

    const enhancedResult: GameResult = {
      ...result,
      behavioralMetrics: result.data?.behavioralMetrics,
      sessionNumber: gameSessionNumber
    };

    setResults(prev => [...prev, enhancedResult]);
    if (role === 'child') {
      navigateTo('assessment');
    } else {
      navigateTo('results');
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return Math.max(0, Math.min(9, age));
  };

  const calculateBMI = (heightCm: number, weightKg: number) => {
    if (heightCm <= 0 || weightKg <= 0) return 0;
    const heightM = heightCm / 100;
    return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
  };

  const handleAddObservation = (text: string) => {
    const newObs: Observation = {
      id: Date.now().toString(),
      text,
      timestamp: Date.now()
    };
    setChild(prev => ({
      ...prev,
      observations: [newObs, ...prev.observations]
    }));
  };

  const getCategoryScores = () => {
    const categories = {
      cognitive: { games: ['memory', 'shapes', 'counting', 'maze'], total: 0, count: 0 },
      social: { games: ['emotion', 'leader'], total: 0, count: 0 },
      language: { games: ['sound'], total: 0, count: 0 },
      attention: { games: ['simon', 'category', 'catcher'], total: 0, count: 0 },
    };

    if (results.length === 0) {
      return { cognitive: 0, social: 0, language: 0, attention: 0 };
    }

    results.forEach(res => {
      Object.keys(categories).forEach(catKey => {
        const cat = categories[catKey as keyof typeof categories];
        if (cat.games.includes(res.gameId)) {
          cat.total += Math.min(100, res.score); 
          cat.count++;
        }
      });
    });

    const getAvg = (cat: { total: number; count: number }) => cat.count > 0 ? Math.round(cat.total / cat.count) : 0;

    return {
      cognitive: getAvg(categories.cognitive),
      social: getAvg(categories.social),
      language: getAvg(categories.language),
      attention: getAvg(categories.attention),
    };
  };

  const scores = getCategoryScores();
  const overallScore = results.length > 0
    ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 4)
    : 0;

  // Calculate CECI score using ML Pipeline with fallback to local calculation
  const {
    score: apiCeciScore,
    source: ceciSource,
    loading: ceciLoading,
    error: ceciError,
    apiAvailable,
    calculate: calculateCeciScore
  } = useCECICalculation(results, child.name || 'Child', { autoCalculate: true });

  // Use API result if available, otherwise fallback to local calculation
  const ceciScore = apiCeciScore || calculateCECI(results, child.name || 'Child');

  const handleRoleSelection = (selectedRole: UserRole) => {
    setRole(selectedRole);
    if (selectedRole === 'child') {
      navigateTo('assessment');
    } else if (selectedRole === 'doctor') {
      navigateTo('results');
    } else {
      navigateTo('onboarding-parent');
    }
  };

  const renderSection = () => {
    switch (section) {
      case 'welcome':
        return (
          <div className="container mx-auto px-4 py-20 text-center">
            <div className="text-[12rem] md:text-[15rem] mb-8 animate-float drop-shadow-2xl inline-block cursor-pointer" onClick={() => navigateTo('welcome')}>
               <span className="select-none">🌟</span>
            </div>
            
            <div className="animate-pop-in" style={{ animationDelay: '0.2s' }}>
              <h1 className="text-6xl md:text-8xl font-black text-purple-700 mb-6 tracking-tight">
                Hi! I'm <span className="text-orange-500">Starry!</span>
              </h1>
              <p className="text-2xl md:text-3xl text-purple-400 mb-16 font-semibold">
                Ready to explore your super powers?
              </p>
            </div>
            
            <div className="animate-pop-in max-w-5xl mx-auto mb-20 bg-white p-12 md:p-16 rounded-[4rem] kids-shadow border-4 border-purple-100 shadow-2xl" style={{ animationDelay: '0.4s' }}>
              <h2 className="text-4xl md:text-5xl font-black text-purple-800 leading-tight tracking-tight mb-8">
                Early Childhood <span className="text-orange-500">Intellectual Disability</span> Screening
              </h2>
              <p className="text-xl md:text-2xl text-gray-600 font-medium leading-relaxed text-left md:text-center">
                This project uses simple interactive games to understand how young children think and learn. 
                By observing how a child plays—such as <span className="text-blue-500 font-bold">response time</span>, 
                mistakes, and improvement over repeated sessions—the system can identify 
                <span className="text-purple-600 font-bold">consistent learning difficulties</span> and separate them from 
                temporary low effort or mood changes. This game-based approach is 
                non-stressful, child-friendly, and supportive of early screening, 
                helping educators and parents recognize potential challenges early and 
                seek timely professional guidance.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 justify-center items-center animate-pop-in" style={{ animationDelay: '0.8s' }}>
              <button 
                onClick={() => navigateTo('login')}
                className="bg-[#FF9F1C] hover:bg-orange-400 text-white font-black text-3xl px-20 py-8 rounded-[3rem] transition-all hover:scale-110 active:scale-95 kids-button-shadow min-w-[320px] flex items-center justify-center gap-4 group"
              >
                LET'S PLAY! <span className="group-hover:translate-x-2 transition-transform">🚀</span>
              </button>
              <button 
                onClick={() => navigateTo('help')}
                className="bg-white border-4 border-purple-500 text-purple-600 font-black text-3xl px-20 py-8 rounded-[3rem] transition-all hover:scale-105 active:scale-95 kids-button-shadow min-w-[320px]"
              >
                TUTORIAL
              </button>
            </div>
          </div>
        );

      case 'login':
        return (
          <div className="container mx-auto px-4 py-20 text-center animate-pop-in">
            <h2 className="text-5xl font-black text-purple-700 mb-4">Welcome Back!</h2>
            <p className="text-2xl text-purple-400 font-bold mb-16">Who is logging in today?</p>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <button 
                onClick={() => handleRoleSelection('child')}
                className="bg-white p-12 rounded-[4rem] kids-shadow border-4 border-transparent hover:border-blue-400 group transition-all"
              >
                <div className="text-8xl mb-6 bg-blue-100 w-32 h-32 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-12 transition-transform">🎮</div>
                <h3 className="text-3xl font-black text-blue-600">Child</h3>
                <p className="text-gray-500 font-bold mt-2">I want to play games!</p>
              </button>

              <button 
                onClick={() => handleRoleSelection('parent')}
                className="bg-white p-12 rounded-[4rem] kids-shadow border-4 border-transparent hover:border-purple-400 group transition-all"
              >
                <div className="text-8xl mb-6 bg-purple-100 w-32 h-32 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-12 transition-transform">❤️</div>
                <h3 className="text-3xl font-black text-purple-600">Parent</h3>
                <p className="text-gray-500 font-bold mt-2">Manage child profile</p>
              </button>

              <button 
                onClick={() => handleRoleSelection('doctor')}
                className="bg-white p-12 rounded-[4rem] kids-shadow border-4 border-transparent hover:border-green-400 group transition-all"
              >
                <div className="text-8xl mb-6 bg-green-100 w-32 h-32 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-12 transition-transform">🩺</div>
                <h3 className="text-3xl font-black text-green-600">Doctor</h3>
                <p className="text-gray-500 font-bold mt-2">Analyze health data</p>
              </button>
            </div>
          </div>
        );

      case 'onboarding-parent':
        return (
          <div className="max-w-xl mx-auto py-20 px-4 animate-pop-in">
            <div className="bg-white p-12 rounded-[4rem] kids-shadow border-4 border-purple-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-orange-500"></div>
              <h2 className="text-4xl font-black text-purple-600 mb-10 text-center">Hello, Parent! 👋</h2>
              <div className="space-y-8">
                <div>
                  <label className="block text-gray-500 font-black mb-3 ml-2 text-sm uppercase">Your Full Name</label>
                  <input type="text" className="w-full p-6 rounded-[2rem] bg-gray-50 border-4 border-transparent focus:border-purple-200 outline-none text-gray-900 font-bold text-xl" value={parent.name} onChange={e => setParent({...parent, name: e.target.value})} placeholder="Super Parent Name" />
                </div>
                <div>
                  <label className="block text-gray-500 font-black mb-3 ml-2 text-sm uppercase">Email Address</label>
                  <input type="email" className="w-full p-6 rounded-[2rem] bg-gray-50 border-4 border-transparent focus:border-purple-200 outline-none text-gray-900 font-bold text-xl" value={parent.email} onChange={e => setParent({...parent, email: e.target.value})} placeholder="you@email.com" />
                </div>
                <button disabled={!parent.name || !parent.email} onClick={() => navigateTo('onboarding-child')} className="w-full bg-[#FF9F1C] text-white py-6 rounded-[2.5rem] font-black text-2xl hover:scale-105 transition-all kids-button-shadow uppercase">Continue to Child Setup ➜</button>
              </div>
            </div>
          </div>
        );

      case 'onboarding-child':
        return (
          <div className="max-w-3xl mx-auto py-10 px-4 animate-pop-in">
            <div className="bg-white p-10 rounded-[4rem] kids-shadow border-4 border-purple-100 relative overflow-hidden">
              <h2 className="text-4xl font-black text-purple-600 mb-10 text-center">Child Super Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="col-span-full md:col-span-1">
                  <label className="block text-gray-500 font-black mb-3 ml-2 text-sm uppercase">Child's Name</label>
                  <input type="text" className="w-full p-5 rounded-[2rem] bg-gray-50 border-4 border-transparent focus:border-purple-200 outline-none text-gray-900 font-bold text-xl" value={child.name} onChange={e => setChild({...child, name: e.target.value})} placeholder="Enter name" />
                </div>
                <div className="col-span-full md:col-span-1">
                  <label className="block text-gray-500 font-black mb-3 ml-2 text-sm uppercase">Birthday</label>
                  <input type="date" className="w-full p-5 rounded-[2rem] bg-gray-50 border-4 border-transparent focus:border-purple-200 outline-none text-gray-900 font-bold text-xl" value={child.dob} onChange={e => { 
                    const age = calculateAge(e.target.value); 
                    setChild({...child, dob: e.target.value, age}); 
                  }} />
                </div>

                <div className="col-span-full md:col-span-1">
                  <label className="block text-gray-500 font-black mb-3 ml-2 text-sm uppercase">Blood Group</label>
                  <select 
                    className="w-full p-5 rounded-[2rem] bg-gray-50 border-4 border-transparent focus:border-purple-200 outline-none text-gray-900 font-bold text-xl appearance-none"
                    value={child.bloodGroup}
                    onChange={e => setChild({...child, bloodGroup: e.target.value})}
                  >
                    <option value="">Select Group</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-full md:col-span-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-500 font-black mb-3 ml-2 text-sm uppercase">Height (cm)</label>
                    <input 
                      type="number" 
                      className="w-full p-5 rounded-[2rem] bg-gray-50 border-4 border-transparent focus:border-purple-200 outline-none text-gray-900 font-bold text-xl" 
                      value={child.height || ''} 
                      onChange={e => {
                        const h = parseFloat(e.target.value) || 0;
                        setChild({...child, height: h, bmi: calculateBMI(h, child.weight)});
                      }}
                      placeholder="cm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 font-black mb-3 ml-2 text-sm uppercase">Weight (kg)</label>
                    <input 
                      type="number" 
                      className="w-full p-5 rounded-[2rem] bg-gray-50 border-4 border-transparent focus:border-purple-200 outline-none text-gray-900 font-bold text-xl" 
                      value={child.weight || ''} 
                      onChange={e => {
                        const w = parseFloat(e.target.value) || 0;
                        setChild({...child, weight: w, bmi: calculateBMI(child.height, w)});
                      }}
                      placeholder="kg"
                    />
                  </div>
                </div>

                <div className="col-span-full">
                  <div className="bg-purple-50 p-8 rounded-[2.5rem] flex items-center justify-between border-4 border-purple-100 shadow-inner">
                    <div className="text-center md:text-left">
                      <span className="text-purple-400 font-black text-xs block uppercase tracking-widest mb-1">Calculated BMI</span>
                      <span className="text-purple-700 font-black text-5xl">{child.bmi || '--'}</span>
                    </div>
                    <div className="text-center md:text-right">
                       <span className="text-gray-400 font-bold text-xs block uppercase tracking-widest mb-1">Current Age</span>
                       <span className="text-gray-800 font-black text-4xl">{child.age} <small className="text-lg">Years</small></span>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                disabled={!child.name || !child.dob} 
                onClick={() => navigateTo('results')} 
                className="w-full mt-12 bg-purple-600 text-white py-7 rounded-[2.5rem] font-black text-2xl hover:scale-105 transition-all kids-button-shadow uppercase"
              >
                Save & View Report ➜
              </button>
            </div>
          </div>
        );

      case 'results':
        const centerX = 200;
        const centerY = 200;
        const radius = 130;
        const getPoint = (val: number, angle: number) => {
          const r = (Math.max(5, val) / 100) * radius;
          return {
            x: centerX + r * Math.sin((angle * Math.PI) / 180),
            y: centerY - r * Math.cos((angle * Math.PI) / 180),
          };
        };

        const radarPoints = [
          getPoint(scores.cognitive, 0),
          getPoint(scores.social, 90),
          getPoint(scores.language, 180),
          getPoint(scores.attention, 270),
        ];

        const radarPath = radarPoints.map(p => `${p.x},${p.y}`).join(' ');

        return (
          <div className="container mx-auto px-6 py-10 max-w-7xl animate-pop-in">
            <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-left">
                <h1 className="text-5xl font-black text-purple-700 mb-2">Development Report</h1>
                <p className="text-gray-500 font-bold text-2xl">
                  {role === 'doctor' ? `Analyzing patient: ${child.name || 'Anonymous'}` : `Tracking ${child.name || 'your child'}'s progress`}
                </p>
              </div>
              {role === 'parent' && (
                <button 
                  onClick={() => navigateTo('onboarding-child')}
                  className="bg-purple-600 text-white px-10 py-4 rounded-[2rem] font-black text-xl hover:bg-purple-500 transition-all kids-button-shadow"
                >
                  ⚙️ Update Profile
                </button>
              )}
            </header>

            <div className="space-y-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Age', value: `${child.age} yrs`, icon: '🎂', color: 'bg-blue-100 text-blue-600' },
                  { label: 'Blood Group', value: child.bloodGroup || 'N/A', icon: '🩸', color: 'bg-red-100 text-red-600' },
                  { label: 'BMI Score', value: child.bmi || 'N/A', icon: '⚖️', color: 'bg-green-100 text-green-600' },
                  { label: 'Height/Weight', value: `${child.height || 0}cm / ${child.weight || 0}kg`, icon: '📏', color: 'bg-purple-100 text-purple-600' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-8 rounded-[3rem] kids-shadow border-4 border-purple-50 flex items-center gap-6">
                    <div className={`${stat.color} w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-inner`}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-2xl font-black text-gray-800">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CECI Score Display */}
              <div className={`bg-white p-12 rounded-[5rem] kids-shadow border-8 ${
                ceciScore.riskBand === 'green' ? 'border-green-300' :
                ceciScore.riskBand === 'amber' ? 'border-yellow-300' :
                'border-red-300'
              }`}>
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-6">
                      <h2 className="text-4xl font-black text-purple-700">CECI Assessment</h2>
                      <span className={`px-6 py-3 rounded-[2rem] font-black text-xl ${
                        ceciScore.riskBand === 'green' ? 'bg-green-100 text-green-700' :
                        ceciScore.riskBand === 'amber' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {ceciScore.riskBand === 'green' ? '✓ Typical Development' :
                         ceciScore.riskBand === 'amber' ? '⚠ Monitor Closely' :
                         '⚡ Specialist Recommended'}
                      </span>
                    </div>
                    <p className="text-gray-600 font-bold text-lg mb-4 leading-relaxed">
                      {ceciScore.recommendation}
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="bg-purple-50 p-4 rounded-3xl">
                        <p className="text-xs font-black text-purple-400 uppercase mb-1">Overall Score</p>
                        <p className="text-4xl font-black text-purple-700">{ceciScore.overall}%</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-3xl">
                        <p className="text-xs font-black text-blue-400 uppercase mb-1">Confidence</p>
                        <p className="text-4xl font-black text-blue-700">{ceciScore.confidence}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 bg-gray-50 p-8 rounded-[3rem]">
                    <h3 className="text-2xl font-black text-gray-700 mb-6">Model Analysis</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="font-bold text-gray-600">Feature-Based Model</span>
                          <span className="font-black text-purple-600">{ceciScore.treeBasedScore}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-4 rounded-full">
                          <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full" style={{ width: `${ceciScore.treeBasedScore}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="font-bold text-gray-600">Temporal Model</span>
                          <span className="font-black text-blue-600">{ceciScore.temporalScore}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-4 rounded-full">
                          <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style={{ width: `${ceciScore.temporalScore}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="font-bold text-gray-600">Bayesian Calibration</span>
                          <span className="font-black text-green-600">{ceciScore.bayesianCalibration}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-4 rounded-full">
                          <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full" style={{ width: `${ceciScore.bayesianCalibration}%` }}></div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-white rounded-2xl border-2 border-gray-100">
                      <p className="text-xs text-gray-500 font-bold">
                        Sessions Analyzed: {results.length} | Multi-model hybrid approach combining Random Forest, LSTM/GRU temporal analysis, and Bayesian uncertainty quantification.
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          ceciSource === 'api' ? 'bg-green-100 text-green-700' :
                          ceciSource === 'local' ? 'bg-gray-100 text-gray-600' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {ceciLoading ? '⏳ Calculating...' :
                           ceciSource === 'api' ? '✓ ML Pipeline' :
                           ceciSource === 'local' ? '⚠ Local Mode' :
                           'Initializing...'}
                        </span>
                        {ceciError && (
                          <span className="text-[10px] text-orange-600 font-bold">
                            {ceciError}
                          </span>
                        )}
                        {!apiAvailable && !ceciLoading && (
                          <span className="text-[10px] text-gray-500 font-bold">
                            (API offline - using local algorithm)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-16 rounded-[5rem] kids-shadow border-4 border-purple-50">
                <h2 className="text-4xl font-black text-purple-700 mb-16 text-center">Development Performance Graph</h2>
                <div className="flex flex-col items-center">
                  <div className="relative w-full flex justify-center py-6">
                    <svg width="450" height="450" viewBox="0 0 400 400" className="overflow-visible drop-shadow-2xl">
                      {[20, 40, 60, 80, 100].map(r => (
                        <circle key={r} cx="200" cy="200" r={(r/100) * radius} fill="none" stroke="#F1F5F9" strokeWidth="2" />
                      ))}
                      {[0, 90, 180, 270].map(a => {
                        const p = getPoint(100, a);
                        return <line key={a} x1="200" y1="200" x2={p.x} y2={p.y} stroke="#F1F5F9" strokeWidth="2" />;
                      })}
                      <polygon 
                        points={radarPath} 
                        fill="rgba(34, 211, 238, 0.3)" 
                        stroke="#22d3ee" 
                        strokeWidth="6" 
                        strokeLinejoin="round"
                        className="transition-all duration-1000 ease-out"
                      />
                      {radarPoints.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="7" fill="#22d3ee" className="drop-shadow-md" />
                      ))}
                      <text x="200" y="-15" textAnchor="middle" className="text-[16px] font-black fill-purple-700 uppercase">Cognitive</text>
                      <text x="200" y="8" textAnchor="middle" className="text-[14px] font-bold fill-gray-400">{scores.cognitive}%</text>

                      <text x="360" y="200" textAnchor="start" className="text-[16px] font-black fill-purple-700 uppercase">Social</text>
                      <text x="360" y="220" textAnchor="start" className="text-[14px] font-bold fill-gray-400">{scores.social}%</text>

                      <text x="200" y="415" textAnchor="middle" className="text-[16px] font-black fill-purple-700 uppercase">Language</text>
                      <text x="200" y="435" textAnchor="middle" className="text-[14px] font-bold fill-gray-400">{scores.language}%</text>

                      <text x="40" y="200" textAnchor="end" className="text-[16px] font-black fill-purple-700 uppercase">Attention</text>
                      <text x="40" y="220" textAnchor="end" className="text-[14px] font-bold fill-gray-400">{scores.attention}%</text>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {role === 'doctor' && (
                  <div className="bg-white p-14 rounded-[4rem] kids-shadow border-4 border-purple-50 col-span-full">
                    <h3 className="text-3xl font-black text-purple-700 mb-10 flex items-center gap-4">
                      <span>📒</span> Parent Observations Diary
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto pr-4">
                      {child.observations.length === 0 ? (
                        <p className="text-gray-400 font-bold italic col-span-full">The parent hasn't added any diary notes yet.</p>
                      ) : (
                        child.observations.map(obs => (
                          <div key={obs.id} className="bg-[#fdfdfd] p-8 rounded-3xl border-l-[15px] border-orange-200 kids-shadow relative bg-[linear-gradient(#e1e9ff_1px,transparent_1px)] bg-[size:100%_2rem] leading-[2rem]">
                             <div className="text-[10px] text-purple-300 font-black absolute top-2 right-4 uppercase tracking-tighter">
                                {new Date(obs.timestamp).toLocaleDateString()}
                             </div>
                             <p className="text-gray-700 font-bold pt-2">{obs.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-white p-14 rounded-[4rem] kids-shadow border-4 border-purple-50">
                  <h3 className="text-3xl font-black text-purple-700 mb-12">Summary Metrics</h3>
                  <div className="space-y-10">
                    {[
                      { label: 'Overall Growth', score: overallScore, color: 'from-orange-400 to-orange-300' },
                      { label: 'Health Index', score: child.bmi > 0 ? 92 : 0, color: 'from-green-400 to-green-300' }
                    ].map((metric, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between mb-4 items-end">
                          <span className="font-black text-gray-700 text-2xl">{metric.label}</span>
                          <span className="font-black text-purple-700 text-3xl">{metric.score}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-10 rounded-full overflow-hidden shadow-inner border-2 border-white">
                          <div className={`h-full bg-gradient-to-r ${metric.color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${metric.score}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-14 rounded-[4rem] kids-shadow border-4 border-purple-50">
                  <h3 className="text-3xl font-black text-purple-700 mb-10">Detailed Analysis</h3>
                  <div className="flex flex-col gap-6">
                      {role === 'doctor' ? (
                        <div className="p-8 bg-blue-50 rounded-[3rem] border-4 border-blue-100">
                           <h4 className="font-black text-blue-700 text-xl mb-4">Doctor's Clinical Notes</h4>
                           <div className="mb-4 text-sm text-blue-600 font-black uppercase tracking-widest">Snapshot: {child.bloodGroup || 'Unknown BG'} • BMI {child.bmi} • Age {child.age}</div>
                           <textarea className="w-full p-5 rounded-3xl bg-white border-2 border-blue-100 outline-none min-h-[140px] font-bold text-gray-700" placeholder="Type clinical findings..."></textarea>
                           <button className="mt-6 w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xl kids-button-shadow">Submit Official Assessment</button>
                        </div>
                      ) : (
                        <div className="p-10 bg-orange-50 rounded-[3rem] border-4 border-orange-100">
                          <p className="text-orange-700 font-black text-2xl mb-4">Daily Growth Tip 💡</p>
                          <p className="text-gray-600 font-bold text-lg leading-relaxed mb-8">
                            "Based on the results, focused language activities like reading together would be very beneficial for {child.name} this week!"
                          </p>
                          <button onClick={() => navigateTo('assessment')} className="w-full bg-[#FF9F1C] text-white py-5 rounded-[2rem] font-black text-xl kids-button-shadow">Play Discovery Games</button>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'help': return <HelpPage />;
      case 'assessment': return <AssessmentPage profile={child} onGameComplete={handleGameComplete} />;
      default: return null;
    }
  };

  const navItems = [
    { id: 'welcome', label: 'Dashboard', roles: ['parent'] },
    { id: 'assessment', label: 'Assessment', roles: ['child'] },
    { id: 'results', label: 'Results', roles: ['parent', 'doctor'] },
    { id: 'help', label: 'Help', roles: ['child', 'parent', 'doctor'] }
  ].filter(item => {
    if (!role) {
      return item.id === 'welcome' || item.id === 'help';
    }
    if (role === 'parent' && item.id === 'assessment') {
      return false;
    }
    return item.roles.includes(role);
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9E6]">
      <nav className="py-8 px-6 sticky top-0 z-50 transition-all bg-white/80 backdrop-blur-xl border-b-4 border-purple-100 shadow-xl">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            {section !== 'welcome' && (
              <button 
                onClick={goBack}
                className="bg-purple-100 text-purple-700 w-14 h-14 rounded-full flex items-center justify-center text-3xl kids-shadow hover:scale-110 active:scale-95 transition-all"
              >
                ⬅️
              </button>
            )}
            <button onClick={() => { setSection('welcome'); setRole(null); setHistory([]); }} className="text-4xl font-black flex items-center gap-4 text-purple-700 hover:scale-110 transition-all group">
              <span className="text-5xl drop-shadow-md group-hover:rotate-12 transition-transform">🌟</span> KidsScreen
            </button>
          </div>
          
          <div className="hidden md:flex gap-2 p-1.5 bg-gray-100 rounded-full shadow-inner border border-gray-200">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id as Section)}
                className={`
                  font-black capitalize transition-all text-lg px-8 py-3 rounded-full
                  ${section === item.id || (item.id === 'welcome' && section === 'welcome') ? 'text-white bg-purple-600 shadow-lg scale-105' : 'text-gray-500 hover:text-purple-600'}
                `}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {role ? (
              <button 
                onClick={() => { setRole(null); setSection('welcome'); setHistory([]); }}
                className="bg-gray-100 text-gray-500 px-8 py-3 rounded-full font-black text-lg hover:bg-gray-200 transition-all shadow-sm"
              >
                Log Out
              </button>
            ) : (
              <>
                <button onClick={() => navigateTo('login')} className="text-purple-700 font-black text-xl hover:bg-purple-50 px-8 py-3 rounded-full transition-all">Log In</button>
                <button onClick={() => navigateTo('login')} className="bg-purple-600 text-white px-10 py-3 rounded-full font-black text-xl hover:bg-purple-500 transition-all shadow-lg active:scale-95">Sign Up</button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {renderSection()}
      </main>

      {role === 'parent' && (
        <button 
          onClick={() => setIsDiaryOpen(true)}
          className="fixed bottom-10 right-10 z-[80] bg-orange-400 text-white w-20 h-20 rounded-full flex items-center justify-center text-4xl kids-button-shadow hover:scale-110 transition-all animate-bounce"
        >
          📒
        </button>
      )}

      <ObservationsDiary 
        isOpen={isDiaryOpen} 
        onClose={() => setIsDiaryOpen(false)} 
        observations={child.observations}
        onAdd={handleAddObservation}
        childName={child.name}
      />

      <footer className="py-20 text-center transition-all bg-white text-gray-400 border-t-8 border-purple-50">
        <div className="container mx-auto px-4">
          <p className="font-black text-5xl mb-4 text-purple-700">KidsScreen Interactive</p>
          <p className="font-bold text-2xl text-purple-300">Making growth an amazing adventure! 🚀</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
