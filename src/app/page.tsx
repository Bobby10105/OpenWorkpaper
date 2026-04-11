import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { PlusCircle, Calendar, ChevronRight, Archive, Inbox, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function AuditCard({ audit }: { audit: any }) {
  return (
    <Link key={audit.id} href={`/audits/${audit.id}`} className="block group">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow h-full flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2">
            {audit.title}
          </h2>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
        </div>
        <p className="text-gray-600 mb-4 line-clamp-3 flex-1 text-sm">
          {audit.objective || audit.description || "No objective defined."}
        </p>
        <div className="flex items-center justify-between text-sm text-gray-500 mt-auto pt-4 border-t border-gray-50">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${audit.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
            {audit.status}
          </span>
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(audit.createdAt), 'MMM d, yyyy')}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function Dashboard() {
  const session = await getSession();
  const user = session?.user;

  // Global visibility for Business Operations
  const isGlobalManager = user?.role === 'Business Operations';

  // Default filter for non-logged in or non-manager users
  let whereClause: any = {};
  
  if (!user) {
    // If no user session, show nothing (middleware should ideally prevent this)
    whereClause = { id: 'none' };
  } else if (!isGlobalManager) {
    // IT Administrator and regular auditors only see assigned audits
    whereClause = {
      teamMembers: {
        some: {
          userId: user.id
        }
      }
    };
  }

  const audits = await prisma.audit.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  });

  const activeAudits = audits.filter(a => a.status !== 'Completed');
  const completedAudits = audits.filter(a => a.status === 'Completed');

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Audits Dashboard</h1>
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 border border-gray-300 rounded-md transition-colors shadow-sm font-medium">
            <RotateCcw className="w-4 h-4" />
            <span>Refresh</span>
          </Link>
          {isGlobalManager && (
            <Link href="/audits/new" className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm">
              <PlusCircle className="w-5 h-5" />
              <span>New Audit</span>
            </Link>
          )}
        </div>
      </div>

      {audits.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {isGlobalManager 
            ? "No audits found. Create a new one to get started." 
            : "No audits assigned to you yet."}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Active Audits Section */}
          <section>
            <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-2">
              <Inbox className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Active Audits</h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {activeAudits.length}
              </span>
            </div>
            {activeAudits.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {activeAudits.map(audit => (
                  <AuditCard key={audit.id} audit={audit} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No active audits found.</p>
            )}
          </section>

          {/* Completed / Archived Audits Section */}
          {completedAudits.length > 0 && (
            <section className="pt-8 border-t border-gray-200/60">
              <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-2">
                <Archive className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-bold text-gray-400 uppercase tracking-wide">Completed Archival</h2>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {completedAudits.length}
                </span>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-75 grayscale-[0.2] hover:grayscale-0 transition-all duration-300">
                {completedAudits.map(audit => (
                  <AuditCard key={audit.id} audit={audit} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
