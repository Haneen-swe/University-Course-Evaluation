import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/store';
import { api } from '@/shared/lib/api';
import { BookOpen, Calendar } from 'lucide-react';

export function InstructorDashboardPage() {
  const user = useCurrentUser();
  const { data: offerings, isLoading } = useQuery({
    queryKey: ['offerings', 'instructor', user?.id],
    queryFn: () =>
      api
        .get<{ success: true; data: any[] }>(`/offerings?instructorId=${user?.id}`)
        .then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const now = new Date();

  function windowStatus(o: any): { label: string; color: string } {
    if (!o.evalWindowOpen || !o.evalWindowClose) {
      return { label: 'No eval window set', color: 'text-muted-foreground' };
    }
    const open = new Date(o.evalWindowOpen);
    const close = new Date(o.evalWindowClose);
    if (now < open) return { label: `Opens ${open.toLocaleDateString()}`, color: 'text-amber-600' };
    if (now > close) return { label: `Closed ${close.toLocaleDateString()}`, color: 'text-muted-foreground' };
    return { label: `Open until ${close.toLocaleDateString()}`, color: 'text-green-600' };
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.firstName}!</h1>
        <p className="text-sm text-muted-foreground mt-1">Your course offerings and evaluation results.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading offerings…</p>}
        {offerings?.map((o: any) => {
          const ws = windowStatus(o);
          return (
            <div key={o.id} className="bg-card border border-border rounded-lg p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <BookOpen size={18} className="mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm">{o.course?.code} — {o.course?.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{o.term?.name} · Section {o.section}</div>
                  {/* Evaluation window status */}
                  <div className={`text-xs mt-1 flex items-center gap-1 ${ws.color}`}>
                    <Calendar size={11} />
                    {ws.label}
                  </div>
                  {/* Results release status */}
                  <div className={`text-xs mt-0.5 ${o.resultsReleased ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {o.resultsReleased ? '✓ Results released' : 'Results not yet released'}
                  </div>
                </div>
              </div>
              {o.resultsReleased && (
                <Link
                  to={`/instructor/reports/${o.id}`}
                  className="flex-shrink-0 px-4 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90"
                >
                  View Report
                </Link>
              )}
            </div>
          );
        })}
        {!isLoading && offerings?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No course offerings assigned yet.</div>
        )}
      </div>
    </div>
  );
}
