/** 
 * AMSOS Dashboard - Unified Task Engine
 */
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { PlusCircle, Calendar, ChevronRight, Archive, Inbox, Clock, CheckCircle2, Tag, Hash, LayoutDashboard, Target, AlertTriangle, Users2, Timer, ClipboardList, User as UserIcon, ArrowRight, ExternalLink } from 'lucide-react';
import { format, addDays, formatDistanceToNow } from 'date-fns';
import { getSession } from '@/lib/auth';
import RestoreAuditButton from '@/components/RestoreAuditButton';
import DashboardStats from '@/components/DashboardStats';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function AuditSummaryCard({ audit }: { audit: any }) {
  const totalProcedures = audit._count?.procedures || 0;
  const reviewedProcedures = audit.reviewedCount || 0;
  const progress = totalProcedures > 0 ? Math.round((reviewedProcedures / totalProcedures) * 100) : 0;

  return (
    <Link key={audit.id} href={`/audits/${audit.id}`} className="block group">
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 hover:shadow-xl hover:border-blue-500/30 transition-all duration-500 h-full flex flex-col relative overflow-hidden group">
        <div className={`absolute top-0 left-0 w-full h-1 transition-opacity duration-500 ${audit.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-600 opacity-40 group-hover:opacity-100'}`} />
        
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-3 flex-1 min-w-0 mr-4">
            <div className="flex items-center space-x-2">
              {audit.auditNumber && (
                <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">
                  {audit.auditNumber}
                </span>
              )}
              {audit.category && (
                <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-tighter">
                  {audit.category}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight tracking-tight">
              {audit.title}
            </h2>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-blue-600 transition-all duration-300 text-slate-400 group-hover:text-white">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-auto space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Progress</span>
              <span className={progress === 100 ? 'text-emerald-600' : 'text-blue-600'}>{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
              audit.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}>
              {audit.status}
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              {reviewedProcedures}/{totalProcedures} Reviewed
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const user = session?.user;

  if (!user) return <div className="p-20 text-center font-bold">Session required.</div>;

  // IT Administrators don't use the audit dashboard, they use Logs and User Directory
  if (user.role === 'IT Administrator') {
    redirect('/admin/users');
  }

  const isGlobalManager = user.role === 'Business Operations';
  const userMatch = user.username;
  const userId = user.id;

  // 1. Fetch Authorized Audits
  let whereClause: any = {};
  if (!isGlobalManager) {
    whereClause = {
      teamMembers: {
        some: {
          OR: [
            { userId: user.id },
            { name: user.username },
            { email: user.username }
          ]
        }
      }
    };
  }

  const audits = await prisma.audit.findMany({
    where: whereClause,
    include: {
      _count: { select: { procedures: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Global Stat Accumulators
  let globalTotalProcedures = 0;
  let globalTotalReviewed = 0;
  let globalTotalPendingReview = 0;
  let globalTotalToComplete = 0;
  
  const pendingAuditsData: any[] = [];
  const toCompleteAuditsData: any[] = [];

  // 2. Process each audit for deep metrics
  const processedAudits = await Promise.all(audits.map(async (audit) => {
    // A. Count Reviewed (Sign-off complete)
    const reviewedResults: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM Procedure WHERE auditId = ? AND reviewedBy IS NOT NULL AND reviewedDate IS NOT NULL`,
      audit.id
    );
    const reviewedCount = Number(reviewedResults[0]?.count || 0);

    // B. Find Pending Review (Prepared by someone, but no reviewer sign-off yet)
    const pendingResults: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, title FROM Procedure WHERE auditId = ? AND preparedBy IS NOT NULL AND preparedDate IS NOT NULL AND (reviewedBy IS NULL OR reviewedDate IS NULL)`,
      audit.id
    );
    
    if (pendingResults.length > 0) {
      pendingAuditsData.push({
        id: audit.id,
        title: audit.title,
        pendingProcedures: pendingResults.map(p => ({ id: p.id, title: p.title }))
      });
      globalTotalPendingReview += pendingResults.length;
    }

    // C. Find "My Tasks" (Assigned to you, but no preparer sign-off yet)
    const myTaskResults: any[] = await prisma.$queryRawUnsafe(
      `SELECT p.id, p.title, t.name as assignedToName
       FROM Procedure p 
       LEFT JOIN TeamMember t ON p.assignedToId = t.id
       WHERE p.auditId = ? 
         AND (p.preparedBy IS NULL OR p.preparedDate IS NULL) 
         AND (
           t.userId = ? OR 
           t.name = ? OR 
           t.email = ?
         )`,
      audit.id,
      userId,
      userMatch,
      userMatch
    );

    if (myTaskResults.length > 0) {
      toCompleteAuditsData.push({
        id: audit.id,
        title: audit.title,
        pendingProcedures: myTaskResults.map(p => ({ 
          id: p.id, 
          title: p.title,
          assignedTo: { name: p.assignedToName || 'You' }
        }))
      });
      globalTotalToComplete += myTaskResults.length;
    }

    globalTotalProcedures += (audit._count?.procedures || 0);
    globalTotalReviewed += reviewedCount;

    return { ...audit, reviewedCount };
  }));

  const activeAudits = processedAudits.filter(a => a.status !== 'Completed');
  const completedAudits = processedAudits.filter(a => a.status === 'Completed');
  
  // Calculate Global Portfolio Progress
  const portfolioProgress = globalTotalProcedures > 0 
    ? Math.round((globalTotalReviewed / globalTotalProcedures) * 100) 
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-16 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 font-bold uppercase text-[11px] tracking-widest">Live Audit Oversight & Task Engine</p>
        </div>
        {isGlobalManager && (
          <div className="flex items-center space-x-4">
            <RestoreAuditButton />
            <Link href="/audits/new" className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl transition-all shadow-xl shadow-blue-200 active:scale-95 font-bold text-sm uppercase tracking-widest border border-blue-500">
              <PlusCircle className="w-5 h-5" />
              <span>New Audit</span>
            </Link>
          </div>
        )}
      </div>

      {/* Stats Cards - Now using global totals */}
      <DashboardStats 
        activeCount={activeAudits.length}
        portfolioProgress={portfolioProgress}
        totalPendingReview={globalTotalPendingReview}
        upcomingDeadlines={0}
        totalToComplete={globalTotalToComplete}
        pendingAudits={pendingAuditsData}
        toCompleteAudits={toCompleteAuditsData}
        upcomingAudits={[]}
      />

      {/* Portfolio List */}
      <section className="space-y-8">
        <div className="flex items-center space-x-4 px-2">
          <div className="bg-slate-900 p-2.5 rounded-2xl shadow-lg">
            <Inbox className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Audit Portfolio</h2>
        </div>
        {activeAudits.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {activeAudits.map(audit => (
              <AuditSummaryCard key={audit.id} audit={audit} />
            ))}
          </div>
        ) : (
          <div className="p-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No active fieldwork found</p>
          </div>
        )}
      </section>

      {completedAudits.length > 0 && (
        <section className="space-y-8 pt-8 border-t border-slate-100">
          <h2 className="text-xl font-bold text-slate-400 px-2 uppercase tracking-widest flex items-center">
            <Archive className="w-5 h-5 mr-3" />
            Archive
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
            {completedAudits.map(audit => (
              <AuditSummaryCard key={audit.id} audit={audit} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
