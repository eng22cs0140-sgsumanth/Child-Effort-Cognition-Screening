
import React from 'react';
import { UserRole } from '../types';

interface HelpPageProps {
  role?: UserRole | null;
}

export const HelpPage: React.FC<HelpPageProps> = ({ role }) => {
  if (role === 'doctor') {
    return <DoctorHelpPage />;
  }
  return <ParentHelpPage />;
};

// ── Parent / Tutorial Help ────────────────────────────────────────────────────
const ParentHelpPage: React.FC = () => (
  <div className="bg-[#FFF9E6] text-gray-800 min-h-screen p-8 md:p-16">
    <div className="max-w-5xl mx-auto">

      {/* Hero */}
      <div className="bg-white p-12 rounded-[3rem] kids-shadow border-4 border-purple-100 mb-12 text-center">
        <div className="text-6xl mb-4">🌟</div>
        <h1 className="text-4xl font-bold mb-4 text-purple-600">Welcome to KidsScreen</h1>
        <p className="text-gray-500 text-xl max-w-3xl mx-auto leading-relaxed">
          A fun, game-based tool that helps identify early signs of developmental differences
          in children aged <span className="font-bold text-purple-600">3 to 9 years</span>.
          No tests, no stress — just play!
        </p>
      </div>

      {/* How the app works */}
      <h2 className="text-3xl font-bold mb-6 text-purple-600 text-center">How Does It Work?</h2>
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {[
          { step: '1', icon: '🎮', title: 'Child Plays Games', desc: 'Your child plays short, colourful games — like matching patterns, sorting shapes, catching targets, and following simple instructions. Each game takes 2–5 minutes.' },
          { step: '2', icon: '📊', title: 'App Tracks Behaviour', desc: 'While the child plays, the app quietly records how they respond — how fast, how accurately, how consistently, and how engaged they stay throughout the session.' },
          { step: '3', icon: '📋', title: 'You See the Report', desc: 'After a few sessions, you get a simple, easy-to-read report showing your child\'s strengths and any areas that might need a little extra attention or a doctor\'s review.' },
        ].map(s => (
          <div key={s.step} className="bg-white p-8 rounded-3xl kids-shadow border-t-8 border-purple-400 text-center">
            <div className="w-12 h-12 rounded-full bg-purple-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-4">{s.step}</div>
            <div className="text-4xl mb-4">{s.icon}</div>
            <h3 className="text-xl font-bold text-purple-700 mb-3">{s.title}</h3>
            <p className="text-gray-500 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* What the app tracks */}
      <h2 className="text-3xl font-bold mb-6 text-orange-500 text-center">What Does the App Track?</h2>
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {[
          { icon: '⚡', title: 'Reaction Speed', color: '#7C3AED', desc: 'How quickly your child responds to something on screen. Slower or inconsistent responses across sessions may signal attention or processing differences.' },
          { icon: '🎯', title: 'Accuracy', color: '#F59E0B', desc: 'How often your child picks the correct answer. We look at whether accuracy improves across sessions, stays steady, or keeps dipping — not just a single score.' },
          { icon: '⏳', title: 'Attention & Consistency', color: '#3B82F6', desc: 'Whether your child can stay focused throughout the game. We measure if performance drops off in the second half — a sign of attention fatigue or frustration.' },
          { icon: '🎮', title: 'Engagement', color: '#22C55E', desc: 'How actively your child interacts with the game. Low engagement (lots of random taps, long pauses) can indicate disinterest or difficulty understanding the task.' },
        ].map(t => (
          <div key={t.title} className="bg-white p-8 rounded-3xl kids-shadow flex gap-5 items-start">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ backgroundColor: t.color + '22' }}>
              {t.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2" style={{ color: t.color }}>{t.title}</h3>
              <p className="text-gray-500 leading-relaxed">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* How it measures */}
      <h2 className="text-3xl font-bold mb-6 text-purple-600 text-center">How Does It Measure?</h2>
      <div className="bg-white p-10 rounded-[3rem] kids-shadow border-4 border-purple-100 mb-12">
        <p className="text-gray-600 text-lg leading-relaxed mb-6">
          The app uses a scoring system called the <span className="font-bold text-purple-600">CECI (Child Effort-Cognition Index)</span>. It is not a diagnosis — it is a <span className="font-bold">screening tool</span> that looks at three things across multiple play sessions:
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { label: 'Persistent Difficulty (PID)', color: '#EF4444', desc: 'Does the child consistently score low across sessions, even with effort? This distinguishes genuine learning difficulty from a "bad day".' },
            { label: 'Consistency (Var(Acc))', color: '#3B82F6', desc: 'Is the child\'s performance all over the place? High variation could mean attention issues or emotional variability, rather than fixed difficulty.' },
            { label: 'Effort (Peff)', color: '#22C55E', desc: 'Is the child genuinely trying? The app checks if low scores happen because the child isn\'t engaged — and adjusts the result accordingly.' },
          ].map(m => (
            <div key={m.label} className="p-6 rounded-2xl border-2" style={{ borderColor: m.color + '44', backgroundColor: m.color + '11' }}>
              <div className="font-black text-sm mb-2" style={{ color: m.color }}>{m.label}</div>
              <p className="text-gray-600 text-sm leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 p-6 bg-purple-50 rounded-2xl border-2 border-purple-100">
          <p className="text-purple-700 font-bold text-center">
            🔔 <strong>Important:</strong> The app provides a <em>screening result</em> — not a diagnosis.
            A result showing concern means you should speak to your doctor, who will do a proper clinical evaluation.
            Think of it like a thermometer: it tells you something may be wrong, but a doctor confirms what it is.
          </p>
        </div>
      </div>

      {/* Risk Bands */}
      <h2 className="text-3xl font-bold mb-6 text-purple-600 text-center">Understanding the Results</h2>
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {[
          { band: 'On Track ✅', color: '#22C55E', bg: '#F0FDF4', border: '#86EFAC', desc: 'Your child\'s responses are consistent and age-appropriate. Keep up regular play sessions and celebrate every win!' },
          { band: 'Needs Attention ⚠️', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', desc: 'Some variation detected across sessions. Consider focused practice, ensuring a calm environment, and monitoring progress.' },
          { band: 'Seek Support 🔴', color: '#EF4444', bg: '#FEF2F2', border: '#FCA5A5', desc: 'Persistent difficulty patterns detected. We recommend speaking with your paediatrician or child developmental specialist.' },
        ].map(b => (
          <div key={b.band} className="p-8 rounded-3xl border-2" style={{ backgroundColor: b.bg, borderColor: b.border }}>
            <div className="font-black text-xl mb-3" style={{ color: b.color }}>{b.band}</div>
            <p className="text-gray-600 leading-relaxed">{b.desc}</p>
          </div>
        ))}
      </div>

      {/* Age milestones */}
      <h2 className="text-3xl font-bold mb-6 text-purple-600 text-center">Age-Appropriate Milestones (Ages 3–9)</h2>
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white p-8 rounded-3xl kids-shadow border-t-8 border-blue-400">
          <h3 className="text-2xl font-bold mb-6 text-blue-500 flex items-center gap-2">
            <span>🧒</span> Ages 3–5 (Preschool)
          </h3>
          <ul className="space-y-4 text-gray-600 text-lg">
            <li className="flex items-center gap-2">✨ Matches colours and simple shapes</li>
            <li className="flex items-center gap-2">✨ Follows 2–3 step instructions</li>
            <li className="flex items-center gap-2">✨ Names familiar objects and animals</li>
            <li className="flex items-center gap-2">✨ Engages in simple pretend play</li>
            <li className="flex items-center gap-2">✨ Counts up to 10 with prompting</li>
          </ul>
        </div>
        <div className="bg-white p-8 rounded-3xl kids-shadow border-t-8 border-purple-400">
          <h3 className="text-2xl font-bold mb-6 text-purple-500 flex items-center gap-2">
            <span>🏃</span> Ages 6–9 (School Age)
          </h3>
          <ul className="space-y-4 text-gray-600 text-lg">
            <li className="flex items-center gap-2">✨ Reads simple sentences and words</li>
            <li className="flex items-center gap-2">✨ Solves simple math problems</li>
            <li className="flex items-center gap-2">✨ Understands game rules and takes turns</li>
            <li className="flex items-center gap-2">✨ Expresses complex emotions in words</li>
            <li className="flex items-center gap-2">✨ Maintains focus for 10–20 minutes</li>
          </ul>
        </div>
      </div>

      {/* When to seek support */}
      <h2 className="text-3xl font-bold mb-8 text-orange-500 text-center">When to Seek Support</h2>
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-orange-50 p-8 rounded-3xl kids-shadow border-l-8 border-orange-400">
          <h3 className="text-2xl font-bold mb-6 text-orange-600">Attention & Learning</h3>
          <ul className="space-y-4 text-gray-600 text-lg">
            <li>• Difficulty focusing for more than a few minutes</li>
            <li>• Delayed speech or limited vocabulary</li>
            <li>• Trouble following simple instructions</li>
            <li>• Struggles with numbers or letters past age 6</li>
          </ul>
        </div>
        <div className="bg-orange-50 p-8 rounded-3xl kids-shadow border-l-8 border-orange-400">
          <h3 className="text-2xl font-bold mb-6 text-orange-600">Cognitive & Social</h3>
          <ul className="space-y-4 text-gray-600 text-lg">
            <li>• Struggles with memory for simple daily tasks</li>
            <li>• Problem-solving significantly behind peers</li>
            <li>• Avoids or has difficulty with social interaction</li>
            <li>• High frustration with small challenges</li>
          </ul>
        </div>
      </div>

      {/* FAQs */}
      <h2 className="text-3xl font-bold mb-6 text-green-600 text-center">Common Questions</h2>
      <div className="space-y-4 mb-12">
        {[
          { q: 'Is this a diagnosis?', a: 'No. KidsScreen is a screening tool only. It flags patterns that may need attention. Only a qualified medical professional can make a clinical diagnosis.' },
          { q: 'How many sessions are needed?', a: 'At least 2 sessions are needed for reliable CECI analysis. More sessions (3–5) give the most accurate picture of your child\'s development.' },
          { q: 'Is my child\'s data private?', a: 'Yes. All data is stored securely on this device and is never shared without your explicit consent.' },
          { q: 'My child got a "Seek Support" result — should I worry?', a: 'Not necessarily. The result means your child showed consistent difficulty patterns across games. Talk to your paediatrician — early conversations always help, even if everything turns out fine.' },
        ].map(faq => (
          <div key={faq.q} className="bg-white p-6 rounded-2xl kids-shadow border-b-4 border-purple-100">
            <h4 className="font-bold text-xl mb-2 text-purple-700">Q: {faq.q}</h4>
            <p className="text-gray-500 leading-relaxed">A: {faq.a}</p>
          </div>
        ))}
      </div>

      {/* Professional resources */}
      <h2 className="text-3xl font-bold mb-8 text-green-600 text-center">Professional Resources</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { title: 'Paediatric Developmental Specialist', desc: 'For comprehensive evaluation of cognitive and behavioural development in children aged 3–9.' },
          { title: 'Child Psychologist', desc: 'Supports children with attention, learning, emotional regulation, and social development.' },
          { title: 'Speech & Language Therapist', desc: 'Helps with communication, vocabulary, and comprehension delays.' },
        ].map(r => (
          <div key={r.title} className="bg-white p-6 rounded-2xl kids-shadow border-b-4 border-green-200">
            <h4 className="font-bold text-xl mb-2 text-green-700">{r.title}</h4>
            <p className="text-gray-500">{r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── Doctor Help Page ──────────────────────────────────────────────────────────
const DoctorHelpPage: React.FC = () => (
  <div className="bg-[#F8FAFC] text-gray-800 min-h-screen p-8 md:p-16">
    <div className="max-w-5xl mx-auto">

      {/* Hero */}
      <div className="bg-slate-800 p-12 rounded-[3rem] shadow-2xl mb-12 text-center text-white">
        <div className="text-6xl mb-4">🩺</div>
        <h1 className="text-4xl font-bold mb-4">Clinical Reference Guide</h1>
        <p className="text-slate-300 text-xl max-w-3xl mx-auto leading-relaxed">
          KidsScreen provides <span className="font-bold text-emerald-400">game-based developmental screening</span> for children aged 3–9.
          It is a decision-support tool — not a standalone diagnostic instrument.
          This guide explains what the metrics mean and how to use them in your clinical workflow.
        </p>
      </div>

      {/* What the app provides */}
      <h2 className="text-3xl font-bold mb-6 text-slate-800 text-center">What Does KidsScreen Provide?</h2>
      <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-slate-100 mb-10">
        <p className="text-gray-600 text-lg leading-relaxed mb-6">
          KidsScreen generates a <strong>CECI (Child Effort-Cognition Index)</strong> score from multiple interactive play sessions.
          The CECI quantifies three clinically relevant parameters derived from game-based telemetry data:
        </p>
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {[
            { label: 'PID — Persistent Intellectual Difficulty', color: '#EF4444', desc: 'Mean session accuracy weighted across sessions. A low, stable PID across ≥2 sessions indicates consistent performance deficits that are unlikely to be effort-related.' },
            { label: 'Var(Acc) — Accuracy Variability', color: '#3B82F6', desc: 'Cross-session variance of accuracy. High Var(Acc) suggests inconsistent performance patterns consistent with attention disorders or emotional dysregulation, rather than fixed cognitive impairment.' },
            { label: 'Peff — Effort Index', color: '#22C55E', desc: 'Derived from engagement metrics (tap patterns, empty-space taps, reaction time spikes). Adjusts the CECI to account for sessions where low performance may reflect disengagement rather than genuine difficulty.' },
          ].map(m => (
            <div key={m.label} className="p-6 rounded-2xl border-2" style={{ borderColor: m.color + '44', backgroundColor: m.color + '11' }}>
              <div className="font-black text-sm mb-3" style={{ color: m.color }}>{m.label}</div>
              <p className="text-slate-600 text-sm leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <p className="text-slate-700 font-bold">CECI Formula (simplified):</p>
          <code className="text-purple-700 font-mono text-sm block mt-2">CECI = α × PID + β × Var(Acc) − γ × Peff</code>
          <p className="text-slate-500 text-sm mt-2">Weights (α, β, γ) are calibrated via a Bayesian ML pipeline. At least 2 sessions are required for Var(Acc) computation; single-session results should be interpreted with caution.</p>
        </div>
      </div>

      {/* Domain Indices */}
      <h2 className="text-3xl font-bold mb-6 text-slate-800 text-center">Domain Assessment Indices (6 Metrics)</h2>
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {[
          { label: 'VMI — Visual-Motor Integration', color: '#3B82F6', games: 'Treasure Maze, Number Sequencer', desc: 'Measures the child\'s ability to coordinate visual input with motor responses. Low VMI scores suggest deficits in fine motor planning, visual tracking, or spatial reasoning — relevant for dyspraxia and motor coordination disorders.' },
          { label: 'FRI — Fluid Reasoning Index', color: '#7C3AED', games: 'Memory Match, Counting Garden', desc: 'Assesses non-verbal problem-solving and working memory. Low FRI is associated with intellectual disability, executive function impairment, and processing speed deficits.' },
          { label: 'LCI — Language Comprehension Index', color: '#10B981', games: 'Sound & Words', desc: 'Evaluates receptive language — the child\'s ability to understand spoken words and associate them with visual stimuli. Low LCI may indicate language delay, auditory processing disorder, or autism spectrum traits.' },
          { label: 'IFI — Inhibitory Function Index', color: '#F59E0B', games: 'Simon Says, Category Sort', desc: 'Tests impulse control and response inhibition. High impulsive tap rates and low IFI are characteristic of ADHD and related executive function difficulties.' },
          { label: 'API — Attention Processing Index', color: '#EF4444', games: 'Reaction Catcher', desc: 'Measures sustained attention and reaction speed consistency. Highly variable reaction times combined with low API suggest attention difficulties. API reflects the attentional load capacity of the child.' },
          { label: 'ATI — Attention-Task Integration', color: '#6366F1', games: 'Follow the Leader, Emotion Detective', desc: 'Assesses joint attention and social cognition — the child\'s ability to maintain attention while integrating social cues. Low ATI may indicate autism spectrum traits or social-emotional learning difficulties.' },
        ].map(d => (
          <div key={d.label} className="bg-white p-8 rounded-3xl shadow-xl border-2 border-slate-100">
            <div className="font-black text-lg mb-1" style={{ color: d.color }}>{d.label}</div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-4">Games: {d.games}</div>
            <p className="text-slate-600 leading-relaxed">{d.desc}</p>
          </div>
        ))}
      </div>

      {/* Risk Bands */}
      <h2 className="text-3xl font-bold mb-6 text-slate-800 text-center">Risk Band Classification</h2>
      <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-slate-100 mb-10">
        <div className="space-y-6">
          {[
            { band: '🟢 Green — Typical Development', color: '#22C55E', bg: '#F0FDF4', desc: 'CECI score ≤ 0.35. Performance consistent with age-appropriate development. No clinical follow-up recommended based on screening alone; standard developmental monitoring applies.' },
            { band: '🟡 Amber — Monitor Closely', color: '#F59E0B', bg: '#FFFBEB', desc: 'CECI score 0.35–0.65. Subclinical difficulty patterns detected. Consider re-screening after 4–6 weeks with at least 2 additional sessions. May warrant formal developmental assessment if pattern persists.' },
            { band: '🔴 Red — Specialist Referral Recommended', color: '#EF4444', bg: '#FEF2F2', desc: 'CECI score > 0.65. Consistent performance deficits across multiple domains and sessions. Recommend comprehensive neuropsychological or developmental paediatric assessment. Document screening results for referral.' },
          ].map(b => (
            <div key={b.band} className="flex items-start gap-5 p-6 rounded-2xl border-2" style={{ backgroundColor: b.bg, borderColor: b.color + '44' }}>
              <div className="font-black text-lg shrink-0" style={{ color: b.color }}>{b.band}</div>
              <p className="text-slate-600 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Classification Indicators */}
      <h2 className="text-3xl font-bold mb-6 text-slate-800 text-center">3-Way Classification</h2>
      <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-slate-100 mb-10">
        <p className="text-slate-600 mb-6 leading-relaxed">The CECI model classifies each child into one of four clinical patterns, helping you distinguish the <em>type</em> of difficulty — not just severity:</p>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { label: 'Typical', color: '#22C55E', desc: 'Consistent, age-appropriate performance. Low PID and Var(Acc). No significant clinical concern.' },
            { label: 'Effort Variability', color: '#EAB308', desc: 'High Var(Acc) but good average accuracy. Child may be disengaged, has good days/bad days, or shows situational anxiety. Consider behavioural or environmental factors before escalating.' },
            { label: 'Emotional Variability', color: '#F59E0B', desc: 'Within-session performance degradation (frustration bursts, engagement drop). Suggests emotional regulation difficulty. Relevant for anxiety, ASD, or ADHD presentations.' },
            { label: 'Cognitive Risk', color: '#EF4444', desc: 'High PID (consistently low accuracy) with low Peff (consistent effort). This pattern is most clinically significant and warrants formal assessment for intellectual disability, specific learning disorder, or neurodevelopmental condition.' },
          ].map(c => (
            <div key={c.label} className="p-6 rounded-2xl border-2" style={{ borderColor: c.color + '44', backgroundColor: c.color + '11' }}>
              <div className="font-black text-lg mb-2" style={{ color: c.color }}>{c.label}</div>
              <p className="text-slate-600 text-sm leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How to use in clinical practice */}
      <h2 className="text-3xl font-bold mb-6 text-slate-800 text-center">Using Screening Results in Clinical Practice</h2>
      <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-slate-100 mb-10">
        <div className="space-y-6">
          {[
            { step: '1', title: 'Review the CECI Score & Risk Band', desc: 'Start with the overall risk band (Green/Amber/Red) and the primary classification. These give you the clinical summary — what the algorithm found most significant across sessions.' },
            { step: '2', title: 'Examine Domain Indices (VMI, FRI, LCI, IFI, API, ATI)', desc: 'Look for domain-specific weaknesses. A low LCI with typical VMI/FRI may suggest specific language delay rather than global intellectual disability. Multi-domain deficits are more clinically significant.' },
            { step: '3', title: 'Cross-reference with Parent Observations', desc: 'The parent diary entries (visible in the sidebar) provide ecological validity. Patterns that appear both in game data and parent-reported behaviour carry greater clinical weight.' },
            { step: '4', title: 'Consider the Session Count', desc: 'Single-session results are preliminary. The CECI is most reliable with 3–5 sessions. For amber results from a single session, recommend re-screening before referral.' },
            { step: '5', title: 'Complete the Clinical Assessment Form', desc: 'Use the assessment form at the bottom of the dashboard to document your examination findings, tentative diagnosis, and recommendations. A PDF report can be generated for referral letters or records.' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-5">
              <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-black flex items-center justify-center shrink-0">{s.step}</div>
              <div>
                <div className="font-black text-slate-800 text-lg">{s.title}</div>
                <p className="text-slate-600 leading-relaxed mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Important disclaimer */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-8 mb-10">
        <h3 className="text-xl font-black text-amber-700 mb-3">⚠️ Important Clinical Disclaimer</h3>
        <ul className="space-y-2 text-amber-800 font-medium">
          <li>• KidsScreen is a <strong>screening instrument</strong>, not a diagnostic tool. It cannot replace clinical judgement, standardised psychometric testing, or comprehensive developmental assessment.</li>
          <li>• CECI scores are not equivalent to IQ scores, DSM/ICD diagnostic criteria, or any established standardised measure.</li>
          <li>• Results should always be interpreted in the context of the child's full history, parent report, and clinical examination.</li>
          <li>• A single "Red" band result is not sufficient grounds for diagnosis. It is a prompt for further assessment.</li>
          <li>• This system is intended for children aged <strong>3 to 9 years</strong>. Results for children outside this range should be interpreted with additional caution.</li>
        </ul>
      </div>

    </div>
  </div>
);
