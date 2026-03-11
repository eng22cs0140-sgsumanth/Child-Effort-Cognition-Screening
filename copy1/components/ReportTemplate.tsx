
import React from 'react';
import { ChildProfile, GameResult, DomainIndices } from '../types';
import { CECIResult } from '../services/ceciService';

interface Props {
  child: ChildProfile;
  parentName: string;
  doctorNotes: string;
  ceciAnalysis: CECIResult;
  scores: any;
  overallScore: number;
  examinerName: string;
  caseNo: string;
  referralSource: string;
  presentingComplaints: string;
  behaviorNotes: string;
  diagnosis: string;
  recommendations: string[];
  domainIndices?: DomainIndices;
  totalSessions?: number;
}

export const ReportTemplate: React.FC<Props> = ({
  child,
  parentName,
  doctorNotes,
  ceciAnalysis,
  scores,
  overallScore,
  examinerName,
  caseNo,
  referralSource,
  presentingComplaints,
  behaviorNotes,
  diagnosis,
  recommendations,
  domainIndices,
  totalSessions = 1,
}) => {
  return (
    <div id="report-content" className="p-12 bg-white text-black font-serif max-w-[800px] mx-auto leading-relaxed" style={{ fontSize: '12pt' }}>
      <h1 className="text-center text-2xl font-bold mb-8 uppercase underline">Psychological Assessment Report</h1>

      <div className="grid grid-cols-2 gap-y-2 mb-8">
        <div><span className="font-bold">Name of Client:</span> {child.name}</div>
        <div><span className="font-bold">Father's Name:</span> {parentName}</div>
        <div><span className="font-bold">Date of Birth:</span> {child.dob}</div>
        <div><span className="font-bold">Date of Assessment:</span> {new Date().toLocaleDateString()}</div>
        <div><span className="font-bold">Examiner:</span> {examinerName}</div>
        <div><span className="font-bold">Case No:</span> {caseNo}</div>
      </div>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2">Identifying Information</h2>
        <p className="text-justify">
          {child.name} is a {child.age} year old child.
          Physical metrics recorded: Height {child.height}cm, Weight {child.weight}kg, BMI {child.bmi}.
          Medical conditions noted: {child.conditions || 'None'}.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2">Referral Source and Presenting Complaints</h2>
        <p className="text-justify">
          {referralSource || 'Referred for developmental screening.'}
          Presenting complaints include: {presentingComplaints || 'Screening for potential learning difficulties.'}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2">Tests Administered</h2>
        <ul className="list-disc ml-8">
          <li>Interactive Cognitive Screening Battery (ICSB)</li>
          <li>Child Effort-Cognition Index (CECI) Model v1.0</li>
          <li>Game-based Behavioral Observation</li>
          <li className="italic">Specific Modules: {Object.keys(scores).filter(k => scores[k] > 0).join(', ') || 'Comprehensive Screening'}</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2">Behavior during Assessment Sessions</h2>
        <p className="text-justify">
          {behaviorNotes || 'The client was cooperative and engaged with the interactive assessment games.'}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2">Psychological Evaluation & Metrics</h2>
        <div className="mb-4">
          <p className="font-bold mb-2">Developmental Scores:</p>
          <ul className="list-disc ml-8">
            <li>Cognitive: {scores.cognitive}%</li>
            <li>Social/Emotional: {scores.social}%</li>
            <li>Language: {scores.language}%</li>
            <li>Attention: {scores.attention}%</li>
            <li>Overall Score: {overallScore}%</li>
          </ul>
        </div>

        <div className="mb-4">
          <p className="font-bold mb-2">CECI Screening Analysis ({totalSessions} session{totalSessions !== 1 ? 's' : ''}):</p>
          <p className="mb-2">The Child Effort-Cognition Index (CECI) score is <span className="font-bold">{ceciAnalysis.ceciScore.toFixed(3)}</span>, placing the client in the <span className="font-bold uppercase" style={{ color: ceciAnalysis.riskColor }}>{ceciAnalysis.riskLabel}</span> band.</p>
          <ul className="list-disc ml-8">
            <li>Persistent Difficulty (P<sub>ID</sub>): {(ceciAnalysis.components.pid.value * 100).toFixed(1)}% — {ceciAnalysis.components.pid.interpretation}</li>
            <li>Consistency (1 − Var(Acc)): {(ceciAnalysis.components.consistency.value * 100).toFixed(1)}% — {ceciAnalysis.components.consistency.interpretation}</li>
            <li>Effort Adjustment (P<sub>Eff</sub>): {(ceciAnalysis.components.effort.value * 100).toFixed(1)}% — {ceciAnalysis.components.effort.interpretation}</li>
          </ul>
        </div>

        {domainIndices && (
          <div className="mb-4">
            <p className="font-bold mb-2">Domain Assessment Indices:</p>
            <ul className="list-disc ml-8">
              <li>VMI (Visual-Motor Integration): {domainIndices.VMI}%</li>
              <li>FRI (Fluid Reasoning Index): {domainIndices.FRI}%</li>
              <li>LCI (Language Comprehension Index): {domainIndices.LCI}%</li>
              <li>IFI (Inhibitory Function Index): {domainIndices.IFI}%</li>
              <li>API (Attention Processing Index): {domainIndices.API}%</li>
              <li>ATI (Attention-Task Integration): {domainIndices.ATI}%</li>
            </ul>
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2">Clinical Findings</h2>
        <p className="text-justify whitespace-pre-wrap">
          {doctorNotes}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2">Tentative Diagnosis</h2>
        <p className="font-bold italic">
          {diagnosis || 'Developmental screening pending further clinical correlation.'}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-2">Conclusion and Recommendations</h2>
        <p className="mb-4">On the basis of interactive game-based testing and clinical observation, the following is recommended:</p>
        <ul className="list-disc ml-8">
          {recommendations.length > 0 ? recommendations.map((rec, i) => (
            <li key={i}>{rec}</li>
          )) : (
            <>
              <li>Continued monitoring of developmental milestones.</li>
              <li>Engagement in targeted cognitive play activities.</li>
              <li>Follow-up assessment in 3-6 months.</li>
            </>
          )}
        </ul>
      </section>

      <div className="mt-16 grid grid-cols-2 gap-32">
        <div className="border-t border-black pt-2 text-center">
          <p className="font-bold">Supervisor</p>
          <p className="text-sm italic">Clinical Psychologist</p>
        </div>
        <div className="border-t border-black pt-2 text-center">
          <p className="font-bold">Examiner</p>
          <p>{examinerName}</p>
        </div>
      </div>
    </div>
  );
};
