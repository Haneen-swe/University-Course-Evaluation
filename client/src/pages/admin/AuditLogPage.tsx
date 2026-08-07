import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit', page, action, targetType],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (action) params.set('action', action);
      if (targetType) params.set('targetType', targetType);
      return api
        .get<{
          success: true;
          data: any[];
          pagination: { page: number; limit: number; total: number; totalPages: number };
        }>(`/audit?${params.toString()}`)
        .then(r => r.data);
    },
  });

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  const actionOptions = [
    '', 'USER_LOGIN', 'USER_LOGOUT', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
    'COURSE_CREATED', 'COURSE_UPDATED', 'TERM_CREATED', 'TERM_UPDATED', 'TERM_DELETED',
    'FORM_CREATED', 'FORM_PUBLISHED', 'OFFERING_CREATED', 'OFFERING_UPDATED',
    'EVAL_WINDOW_SET', 'RESULTS_RELEASED', 'RESULTS_RESTRICTED',
    'DEPARTMENT_CREATED', 'DEPARTMENT_UPDATED', 'PASSWORD_RESET',
  ];

  const targetTypes = ['', 'User', 'Course', 'Term', 'EvalFormTemplate', 'CourseOffering', 'Department'];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <p className="text-sm text-muted-foreground">Append-only record of all administrative actions.</p>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Action</label>
          <select
            value={action}
            onChange={e => { setAction(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-input rounded text-sm bg-background"
          >
            {actionOptions.map(a => (
              <option key={a} value={a}>{a || 'All Actions'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Target Type</label>
          <select
            value={targetType}
            onChange={e => { setTargetType(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-input rounded text-sm bg-background"
          >
            {targetTypes.map(t => (
              <option key={t} value={t}>{t || 'All Types'}</option>
            ))}
          </select>
        </div>
        {(action || targetType) && (
          <div className="flex items-end">
            <button
              onClick={() => { setAction(''); setTargetType(''); setPage(1); }}
              className="px-3 py-2 border border-border rounded text-sm text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {isError && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-sm text-destructive">
          <AlertCircle size={16} className="flex-shrink-0" />
          Failed to load audit logs. Please try again.
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>{['Timestamp', 'Actor', 'Action', 'Target', 'IP'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && !isError && logs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">No audit log entries found.</td></tr>
            )}
            {logs.map((log: any) => (
              <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs">
                  {log.actor?.firstName} {log.actor?.lastName}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{log.action}</span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {log.targetType ? `${log.targetType} ${log.targetId?.slice(0, 8)}…` : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{log.ipAddress ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">
            {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1}
              className="p-1.5 border border-border rounded hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 text-xs text-muted-foreground">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page === pagination.totalPages}
              className="p-1.5 border border-border rounded hover:bg-muted disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
