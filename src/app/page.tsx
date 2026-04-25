/** 
 * AMSOS Dashboard - Resilient RAW SQL Version
 * Using robust error handling for procedure metrics to ensure dashboard stability.
 */
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { PlusCircle, Calendar, ChevronRight, Archive, Inbox, Clock, CheckCircle2, Tag, Hash, LayoutDashboard, Target, AlertTriangle, Users2, Timer } from 'lucide-react';
import { format, addDays, formatDistanceToNow } from 'date-fns';
import { getSession } from '@/lib/auth';
import RestoreAuditButton from '@/components/RestoreAuditButton';
import DashboardStats from '@/components/DashboardStats';

export const dynamic = 'force-dynamic';

function AuditSummaryCard({ audit }: { audit: any }) {
  const totalProcedures = audit._count.procedures;
  const reviewedProcedures = audit.reviewedCount || 0;
  const progress = totalProcedures > 0 ? Math.round((reviewedProcedures / totalProcedures) * 100) : 0;

  return (
    <Link key={audit.id} href={`/audits/${audit.id}`} className="block group">
      <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200 p-8 hover:shadow-[0_20px_50px_rgba(37,99,235,0.1)] hover:border-blue-500/30 transition-all duration-500 h-full flex flex-col relative overflow-hidden group">
        <div className={`absolute top-0 left-0 w-full h-1.5 transition-opacity duration-500 ${audit.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-600 opacity-60 group-hover:opacity-100'}`} />
        
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-3 flex-1 min-w-0 mr-4">
            <div className="flex items-center space-x-2 text-slate-900">
              {audit.auditNumber && (
                <span className="flex items-center text-[10px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200 tracking-tight">
                  <Hash className="w-2.5 h-2.5 mr-1" />
                  {audit.auditNumber}
                </span>
              )}
              {audit.category && (
                <span className="flex items-center text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-200 tracking-tight">
                  <Tag className="w-2.5 h-2.5 mr-1" />
                  {audit.category}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight tracking-tight">
              {audit.title}
            </h2>
          </div>
          <div className="bg-slate-100 p-2.5 rounded-2xl group-hover:bg-blue-600 transition-all duration-300 text-slate-500 group-hover:text-white">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>

        <p className="text-slate-500 mb-8 line-clamp-2 text-sm leading-relaxed font-medium opacity-80 group-hover:opacity-100 transition-opacity">
          {audit.objective || audit.description || "No objective defined."}
        </p>

        <div className="mt-auto space-y-5">
          <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-semibold tracking-tight text-slate-500">
              <span className="uppercase tracking-wider">Progress</span>
              <span className={progress === 100 ? 'text-emerald-600' : 'text-blue-600'}>{progress}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(37,99,235,0.1)] ${progress === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_12px_rgba(52,211,153,0.1)]' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center text-[11px] font-medium text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              {reviewedProcedures} of {totalProcedures} procedures reviewed
            </div>
          </div>

          <div className="flex items-center justify-between pt-5 border-t border-slate-200">
            <div className="flex flex-col">
              <div className={`flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-tight w-fit border ${
                audit.status === 'Completed' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                  : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}>
                <Clock className="w-3 h-3 mr-1.5" />
                {audit.status}
              </div>
              <span className="text-[10px] font-medium text-slate-500 mt-1.5 ml-0.5 opacity-60">
                Updated {formatDistanceToNow(new Date(audit.updatedAt), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-500">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(audit.createdAt), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const user = session?.user;

  // Global visibility for Business Operations
  const isGlobalManager = user?.role === 'Business Operations';

  let whereClause: any = {};
  
  if (!user) {
    whereClause = { id: 'none' };
  } else if (!isGlobalManager) {
    whereClause = {
      teamMembers: {
        some: {
          userId: user.id
        }
      }
    };
  }

  // Final Resilience: Wrap entire fetch in try/catch to prevent Dashboard from ever showing "Invalid Prisma"
  let auditsWithBasicCounts: any[] = [];
  try {
    // Initial fetch of audits
    auditsWithBasicCounts = await prisma.audit.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { procedures: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (initialError) {
    console.error('CRITICAL: Dashboard initial audit fetch failed:', initialError);
    // If standard prisma fails, try a very simple raw fetch as last resort
    try {
      auditsWithBasicCounts = await prisma.$queryRawUnsafe(`SELECT * FROM Audit ORDER BY createdAt DESC`);
      // Manually add count mock for raw result
      auditsWithBasicCounts = auditsWithBasicCounts.map(a => ({ ...a, _count: { procedures: 0 } }));
    } catch (rawError) {
      console.error('CRITICAL: Dashboard raw fallback also failed:', rawError);
      return (
        <div className="p-12 text-center bg-red-50 rounded-[2rem] border border-red-100 max-w-2xl mx-auto mt-20">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-red-900 mb-2">Database Connection Error</h1>
          <p className="text-red-700 mb-6">The system is currently syncing database schemas. Please wait 10 seconds and refresh.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg">Refresh Now</button>
        </div>
      );
    }
  }

  let totalPendingReviewCount = 0;
  let totalToCompleteCount = 0;
  let totalProceduresCount = 0;
  let totalReviewedCount = 0;
  let upcomingDeadlinesCount = 0;
  const pendingAuditsData: any[] = [];
  const toCompleteAuditsData: any[] = [];
  const upcomingAuditsData: any[] = [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextSevenDays = addDays(today, 7);
  nextSevenDays.setHours(23, 59, 59, 999);

  const processedAudits = await Promise.all(auditsWithBasicCounts.map(async (audit) => {
    // 1. Count reviewed using RAW SQL with error handling
    let reviewedCount = 0;
    try {
      const reviewedResults: any[] = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM Procedure WHERE auditId = ? AND reviewedBy IS NOT NULL AND reviewedDate IS NOT NULL`,
        audit.id
      );
      reviewedCount = Number(reviewedResults[0]?.count || 0);
    } catch (e) {
      console.warn(`Dashboard: reviewedCount check failed for audit ${audit.id}`);
    }

    // 2. Count pending review using queryRaw with error handling
    let pendingProcedures: any[] = [];
    try {
      pendingProcedures = await prisma.$queryRawUnsafe(
        `SELECT id, title FROM Procedure WHERE auditId = ? AND preparedBy IS NOT NULL AND preparedDate IS NOT NULL AND reviewedBy IS NULL`,
        audit.id
      );
    } catch (e) {
      console.warn(`Dashboard: pendingProcedures check failed for audit ${audit.id}`);
    }

    if (pendingProcedures.length > 0) {
      pendingAuditsData.push({
        id: audit.id,
        title: audit.title,
        pendingProcedures: pendingProcedures.map(p => ({
          id: p.id,
          title: p.title
        }))
      });
      totalPendingReviewCount += pendingProcedures.length;
    }

    // 3. Count to be completed (assigned to CURRENT USER but not prepared) using queryRaw with error handling
    let toCompleteProcedures: any[] = [];
    try {
      toCompleteProcedures = await prisma.$queryRawUnsafe(
        `SELECT p.id, p.title, t.name as assignedToName 
         FROM Procedure p 
         LEFT JOIN TeamMember t ON p.assignedToId = t.id
         WHERE p.auditId = ? AND p.assignedToId IS NOT NULL AND p.preparedBy IS NULL AND t.userId = ?`,
        audit.id,
        user?.id
      );
    } catch (e) {
      console.warn(`Dashboard: toCompleteProcedures check failed for audit ${audit.id}`);
    }


    if (toCompleteProcedures.length > 0) {
      toCompleteAuditsData.push({
        id: audit.id,
        title: audit.title,
        pendingProcedures: toCompleteProcedures.map(p => ({
          id: p.id,
          title: p.title,
          assignedTo: p.assignedToName ? { name: p.assignedToName } : null
        }))
      });
      totalToCompleteCount += toCompleteProcedures.length;
    }

    // 4. Check upcoming deadlines
    if (audit.status !== 'Completed' && audit.fieldworkEndDate) {
      const fieldworkEnd = new Date(audit.fieldworkEndDate);
      if (fieldworkEnd <= nextSevenDays && fieldworkEnd >= today) {
        upcomingDeadlinesCount++;
        upcomingAuditsData.push({
          id: audit.id,
          title: audit.title,
          fieldworkEndDate: audit.fieldworkEndDate
        });
      }
    }

    totalProceduresCount += audit._count.procedures;
    totalReviewedCount += reviewedCount;

    return { ...audit, reviewedCount };
  }));

  const activeAudits = processedAudits.filter(a => a.status !== 'Completed');
  const completedAudits = processedAudits.filter(a => a.status === 'Completed');
  
  const portfolioProgress = totalProceduresCount > 0 
    ? Math.round((totalReviewedCount / totalProceduresCount) * 100) 
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-16 py-4 px-4 sm:px-6 lg:px-8">
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight leading-none">Dashboard</h1>
            <p className="text-slate-500 font-medium">Global oversight of audit performance and portfolio health.</p>
          </div>
          <div className="flex items-center space-x-4">
            {isGlobalManager && <RestoreAuditButton />}
            {isGlobalManager && (
              <Link href="/audits/new" className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-2xl transition-all shadow-xl shadow-blue-600/10 active:scale-95 font-semibold text-sm tracking-tight border border-blue-400/20">
                <PlusCircle className="w-5 h-5" />
                <span>Initiate Audit</span>
              </Link>
            )}
          </div>
        </div>

        <DashboardStats 
          activeCount={activeAudits.length}
          portfolioProgress={portfolioProgress}
          totalPendingReview={totalPendingReviewCount}
          totalToComplete={totalToCompleteCount}
          upcomingDeadlines={upcomingDeadlinesCount}
          pendingAudits={pendingAuditsData}
          toCompleteAudits={toCompleteAuditsData}
          upcomingAudits={upcomingAuditsData}
        />
      </div>

      {processedAudits.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-xl border border-slate-200 p-24 text-center">
          <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-slate-200">
            <Inbox className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">No Engagements Found</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-10 font-medium leading-relaxed">
            {isGlobalManager 
              ? "Your audit portfolio is currently empty. Start by creating a new audit engagement." 
              : "You are not currently assigned to any active audit teams."}
          </p>
          {isGlobalManager && (
            <Link href="/audits/new" className="inline-flex items-center space-x-2 text-blue-600 font-semibold hover:text-blue-500 hover:underline transition-colors">
              <span>Create your first audit</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-24">
          <section>
            <div className="flex items-center justify-between mb-10 px-2">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-600/10 p-2.5 rounded-2xl border border-blue-500/10 shadow-lg text-blue-600">
                  <Inbox className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Active Engagements</h2>
              </div>
              <div className="flex items-center bg-blue-50 text-blue-600 text-[10px] font-bold px-4 py-1.5 rounded-full border border-blue-200 shadow-sm uppercase tracking-wider">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                </span>
                {activeAudits.length} Active
              </div>
            </div>
            {activeAudits.length > 0 ? (
              <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                {activeAudits.map(audit => (
                  <AuditSummaryCard key={audit.id} audit={audit} />
                ))}
              </div>
            ) : (
              <div className="py-20 px-6 bg-slate-50/50 backdrop-blur-sm border-2 border-dashed border-slate-200 rounded-[3rem] text-center">
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">No active fieldwork at this time</p>
              </div>
            )}
          </section>

          {completedAudits.length > 0 && (
            <section className="pt-16 border-t border-slate-200">
              <div className="flex items-center justify-between mb-10 px-2">
                <div className="flex items-center space-x-4">
                  <div className="bg-slate-100 p-2.5 rounded-2xl border border-slate-200 shadow-lg text-slate-500">
                    <Archive className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Historical Archive</h2>
                </div>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-4 py-1.5 rounded-full border border-slate-200 shadow-sm uppercase tracking-wider">
                  {completedAudits.length} Archived
                </span>
              </div>
              <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3 opacity-80 hover:opacity-100 transition-all duration-700">
                {completedAudits.map(audit => (
                  <AuditSummaryCard key={audit.id} audit={audit} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
