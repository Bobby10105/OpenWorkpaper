'use client';

import { useState } from 'react';
import ProcedureList from './ProcedureList';
import MilestonesTab from './MilestonesTab';
import TeamMembersTab from './TeamMembersTab';
import ProcedureMiniMap from './ProcedureMiniMap';
import type { AuditWithRelations } from '@/lib/types';

const PHASES = ['Planning', 'Fieldwork', 'Reporting', 'Milestones', 'Team Members'];
const PHASE_NUMBERS: Record<string, string> = {
  'Planning': 'Phase 1',
  'Fieldwork': 'Phase 2',
  'Reporting': 'Phase 3'
};

const PHASE_MAP: Record<string, number> = {
  'Planning': 1,
  'Fieldwork': 2,
  'Reporting': 3
};

export default function AuditTabs({ 
  audit, 
  user 
}: { 
  audit: AuditWithRelations, 
  user?: { username: string; role: string; id: string } 
}) {
  const [activePhase, setActivePhase] = useState(PHASES[0]);

  const isProcedurePhase = activePhase === 'Planning' || activePhase === 'Fieldwork' || activePhase === 'Reporting';
  const phaseNum = PHASE_MAP[activePhase] || 0;
  const currentPhaseGroups = audit.procedureGroups.filter(g => g.phase === activePhase);

  return (
    <div className="flex flex-col space-y-8">
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200 p-2 shadow-lg">
        <nav className="flex flex-wrap md:flex-nowrap gap-1">
          {PHASES.map((phase) => (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={`
                flex-1 whitespace-nowrap py-3 px-6 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all duration-300 active:scale-[0.98]
                ${activePhase === phase
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 border border-blue-500'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }
              `}
            >
              {PHASE_NUMBERS[phase] ? `${PHASE_NUMBERS[phase]}: ${phase}` : phase}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Left Side: Mini Map (only for procedure phases) */}
        {isProcedurePhase && currentPhaseGroups.length > 0 && (
          <ProcedureMiniMap 
            procedureGroups={currentPhaseGroups} 
            phaseNum={phaseNum}
          />
        )}

        {/* Right Side: Main Content */}
        <div className="flex-1 bg-white rounded-[2.5rem] border border-gray-200 p-10 min-h-[600px] shadow-2xl">
          <div className="flex justify-between items-center mb-10 border-b border-gray-100 pb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
              <span className="w-1.5 h-7 bg-blue-600 rounded-full mr-4 shadow-sm" />
              {PHASE_NUMBERS[activePhase] ? `${PHASE_NUMBERS[activePhase]}: ` : ''}
              <span className="text-gray-900">{activePhase}</span>
              <span className="text-gray-400 ml-2 font-medium">{activePhase === 'Milestones' || activePhase === 'Team Members' ? '' : ' Phase'}</span>
            </h2>
          </div>

          <div className="relative">
            {activePhase === 'Milestones' ? (
              <MilestonesTab audit={audit} />
            ) : activePhase === 'Team Members' ? (
              <TeamMembersTab auditId={audit.id} initialTeamMembers={audit.teamMembers} user={user} />
            ) : (
              <ProcedureList 
                key={activePhase}
                auditId={audit.id} 
                phase={activePhase} 
                audit={audit}
                user={user as any}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
