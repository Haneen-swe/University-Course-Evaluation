import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

export function AuditLogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: () => api.get<{ success: true; data: any[] }>('/audit?limit=50').then(r => r.data.data),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <p className="text-sm text-muted-foreground">Append-only record of all administrative actions.</p>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>{['Timestamp', 'Actor', 'Action', 'Target', 'IP'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</td></tr>}
            {data?.map((log: any) => (
              <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs">{log.actor?.firstName} {log.actor?.lastName}</td>
                <td className="px-4 py-3"><span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{log.action}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{log.targetType ? `${log.targetType} ${log.targetId?.slice(0, 8)}…` : '—'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{log.ipAddress ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
