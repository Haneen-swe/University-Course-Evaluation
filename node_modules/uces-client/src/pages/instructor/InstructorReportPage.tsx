import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function InstructorReportPage() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['report', offeringId],
    queryFn: () => api.get<{ success: true; data: any }>(`/reports/offerings/${offeringId}`).then(r => r.data.data),
  });

  if (isLoading) return <div className="text-muted-foreground text-sm p-6">Loading report…</div>;
  if (isError) return <div className="text-destructive p-6 text-sm">Report not available. Results may not be released yet or threshold not met.</div>;
  if (!report) return null;

  const responseRatePct = Math.round(report.responseRate * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{report.courseName}</h1>
        <p className="text-sm text-muted-foreground">{report.term} · {report.courseCode}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Responses', value: report.responseCount },
          { label: 'Enrolled', value: report.enrollmentCount },
          { label: 'Response Rate', value: `${responseRatePct}%` },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Per-question results */}
      {report.questions?.map((q: any, i: number) => (
        <div key={q.questionId} className="bg-card border border-border rounded-lg p-5 space-y-4">
          <p className="text-sm font-medium">{i + 1}. {q.text}</p>

          {/* Likert distribution chart */}
          {q.type === 'likert' && q.distribution && (
            <div>
              <div className="flex gap-6 text-xs text-muted-foreground mb-3">
                <span>Mean: <strong className="text-foreground">{q.stats?.mean}</strong></span>
                <span>Median: <strong className="text-foreground">{q.stats?.median}</strong></span>
                <span>Std Dev: <strong className="text-foreground">{q.stats?.stdDev}</strong></span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={Object.entries(q.distribution).map(([k, v]) => ({ rating: k, count: v }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Choice distribution */}
          {(q.type === 'single_choice' || q.type === 'multi_choice') && q.distribution && (
            <div className="space-y-2">
              {Object.entries(q.distribution).map(([k, v]) => (
                <div key={k} className="flex items-center gap-3 text-sm">
                  <span className="w-28 truncate text-muted-foreground">{k}</span>
                  <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, (Number(v) / report.responseCount) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-6">{v as number}</span>
                </div>
              ))}
            </div>
          )}

          {/* Open text */}
          {q.type === 'open_text' && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {q.responses?.length === 0 && <p className="text-xs text-muted-foreground italic">No responses.</p>}
              {q.responses?.map((r: string, idx: number) => (
                <div key={idx} className="text-sm bg-muted rounded p-3 text-foreground">{r}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
