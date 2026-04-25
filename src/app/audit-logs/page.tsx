import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ClipboardList, Shield, Trash2, PlusCircle, FileUp, AlertTriangle, User, Clock } from 'lucide-react';

export default async function AuditLogsPage() {
  const session = await getSession();
  const user = session?.user;

  if (!user || (user.role !== 'IT Administrator' && user.role !== 'Business Operations')) {
    redirect('/login');
  }

  let logs = [];
  try {
    logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return (
      <div className="max-w-5xl mx-auto p-8 bg-red-50 border border-red-200 rounded-[2rem] flex items-center space-x-6 text-red-600">
        <AlertTriangle className="w-10 h-10" />
        <div>
          <h2 className="text-xl font-bold">Log Retrieval Failure</h2>
          <p className="text-sm font-medium opacity-80">The system encountered an error while accessing the immutable ledger.</p>
        </div>
      </div>
    );
  }

  const getActionStyle = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'UPDATE': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'DELETE': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getActionIcon = (action: string, entityType: string) => {
    if (action === 'DELETE') return <Trash2 className="w-4 h-4" />;
    if (entityType === 'ATTACHMENT') return <FileUp className="w-4 h-4" />;
    return <PlusCircle className="w-4 h-4" />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight leading-none flex items-center">
            <Shield className="w-8 h-8 mr-4 text-blue-600 shadow-lg shadow-blue-100" />
            System Ledger
          </h1>
          <p className="text-slate-500 font-medium">Tracking immutable system-wide structural changes for accountability.</p>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Activity Stream (Latest 100)</span>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">Secured</span>
        </div>
        
        <div className="divide-y divide-slate-100">
          {logs.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-slate-200 shadow-inner">
                <ClipboardList className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">No system events recorded.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-8 hover:bg-slate-50/50 transition-all group">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="flex items-start space-x-6 flex-1">
                    <div className={`p-3 rounded-2xl border shadow-sm transition-transform group-hover:scale-110 shrink-0 ${getActionStyle(log.action)}`}>
                      {getActionIcon(log.action, log.entityType)}
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="text-slate-800 font-semibold text-lg leading-snug group-hover:text-blue-600 transition-colors">
                        {log.details}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-tight">
                        <span className="text-slate-500 flex items-center">
                          <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                          {log.performedBy || 'System Process'}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                        <span className="text-slate-500 flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                          {format(new Date(log.timestamp), 'MMM d, yyyy • h:mm a')}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                          {log.entityType}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center justify-center space-x-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pt-4">
        <Shield className="w-3 h-3" />
        <span>Immutable Ledger • Authorized Personnel Only</span>
      </div>
    </div>
  );
}
