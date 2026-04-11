'use client';

import { useState } from 'react';
import ProcedureList from './ProcedureList';
import MilestonesTab from './MilestonesTab';
import TeamMembersTab from './TeamMembersTab';
import type { AuditWithRelations } from '@/lib/types';

const PHASES = ['Planning', 'Fieldwork', 'Reporting', 'Milestones', 'Team Members'];
const PHASE_NUMBERS: Record<string, string> = {
  'Planning': 'Phase 1',
  'Fieldwork': 'Phase 2',
  'Reporting': 'Phase 3'
};

export default function AuditTabs({ 
  audit, 
  user 
}: { 
  audit: AuditWithRelations, 
  user?: { username: string; role: string; id: string } 
}) {
  const [activePhase, setActivePhase] = useState(PHASES[0]);

  return (
    <div>
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {PHASES.map((phase) => (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activePhase === phase
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {PHASE_NUMBERS[phase] ? `${PHASE_NUMBERS[phase]}: ${phase}` : phase}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {PHASE_NUMBERS[activePhase] ? `${PHASE_NUMBERS[activePhase]}: ` : ''}
            {activePhase} 
            {activePhase === 'Milestones' || activePhase === 'Team Members' ? '' : ' Phase'}
          </h2>
        </div>

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
  );
}
