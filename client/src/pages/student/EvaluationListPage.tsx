import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import { CheckCircle, Clock } from 'lucide-react';

export function EvaluationListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['evaluations', 'pending'],
    queryFn: () => api.get<{ success: true; data: any[] }>('/evaluations/pending').then(r => r.data.data),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My Evaluations</h1>
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {!isLoading && data?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">No evaluations found for this period.</div>
      )}
      <div className="space-y-3">
        {data?.map((e: any) => (
          <div key={e.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              {e.submitted
                ? <CheckCircle className="text-green-500 mt-0.5 flex-shrink-0" size={18} />
                : <Clock className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
              }
              <div>
                <div className="font-medium text-sm">{e.course?.code} — {e.course?.title}</div>
                <div className="text-xs text-muted-foreground">{e.term?.name} · {e.instructor?.firstName} {e.instructor?.lastName}</div>
                <div className={`text-xs mt-0.5 ${e.submitted ? 'text-green-600' : 'text-amber-600'}`}>
                  {e.submitted ? 'Submitted' : `Closes ${e.evalWindowClose ? new Date(e.evalWindowClose).toLocaleDateString() : 'N/A'}`}
                </div>
              </div>
            </div>
            {!e.submitted && (
              <Link to={`/student/evaluations/${e.id}`} className="px-4 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 flex-shrink-0">
                Evaluate
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
