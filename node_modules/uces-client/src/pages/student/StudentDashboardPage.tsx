import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/store';
import { api } from '@/shared/lib/api';
import { ClipboardList, CheckCircle, Clock } from 'lucide-react';

interface PendingEval {
  id: string;
  course: { code: string; title: string };
  term: { name: string };
  instructor: { firstName: string; lastName: string };
  evalWindowClose: string;
  submitted: boolean;
}

export function StudentDashboardPage() {
  const user = useCurrentUser();
  const { data, isLoading } = useQuery({
    queryKey: ['evaluations', 'pending'],
    queryFn: () => api.get<{ success: true; data: PendingEval[] }>('/evaluations/pending').then(r => r.data.data),
  });

  const pending = data?.filter(e => !e.submitted) ?? [];
  const submitted = data?.filter(e => e.submitted) ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.firstName}!</h1>
        <p className="text-muted-foreground text-sm mt-1">Your course evaluations for this term are listed below.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-3">
            <Clock className="text-amber-500" size={22} />
            <div>
              <div className="text-2xl font-bold">{isLoading ? '…' : pending.length}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-500" size={22} />
            <div>
              <div className="text-2xl font-bold">{isLoading ? '…' : submitted.length}</div>
              <div className="text-sm text-muted-foreground">Submitted</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending evaluations */}
      {pending.length > 0 && (
        <div>
          <h2 className="font-semibold text-base mb-3 flex items-center gap-2"><ClipboardList size={16} /> Evaluations requiring your attention</h2>
          <div className="space-y-3">
            {pending.map((e) => (
              <div key={e.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{e.course?.code} — {e.course?.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {e.term?.name} · {e.instructor?.firstName} {e.instructor?.lastName}
                  </div>
                  <div className="text-xs text-amber-600 mt-0.5">
                    Closes {e.evalWindowClose ? new Date(e.evalWindowClose).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <Link
                  to={`/student/evaluations/${e.id}`}
                  className="px-4 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90"
                >
                  Start
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && !isLoading && (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
          <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
          All evaluations are up to date. Nothing pending.
        </div>
      )}
    </div>
  );
}
