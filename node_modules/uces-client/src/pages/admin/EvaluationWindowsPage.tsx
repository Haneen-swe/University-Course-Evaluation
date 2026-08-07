import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { Calendar } from 'lucide-react';

export function EvaluationWindowsPage() {
  const qc = useQueryClient();
  const { data: offerings, isLoading } = useQuery({
    queryKey: ['offerings'],
    queryFn: () => api.get<{ success: true; data: any[] }>('/offerings').then(r => r.data.data),
  });

  const { data: forms } = useQuery({
    queryKey: ['forms', 'published'],
    queryFn: () =>
      api.get<{ success: true; data: any[] }>('/forms').then(r =>
        r.data.data.filter((f: any) => f.isPublished)
      ),
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [windowForm, setWindowForm] = useState({ evalWindowOpen: '', evalWindowClose: '' });

  const windowMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof windowForm }) =>
      api.put(`/offerings/${id}/window`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['offerings'] }); setEditing(null); },
  });

  const [releaseError, setReleaseError] = useState<string | null>(null);

  const releaseMutation = useMutation({
    mutationFn: ({ id, release }: { id: string; release: boolean }) =>
      api.put(`/offerings/${id}/release`, { resultsReleased: release }),
    onSuccess: () => {
      setReleaseError(null);
      qc.invalidateQueries({ queryKey: ['offerings'] });
    },
    onError: (e: any) => {
      setReleaseError(
        e?.response?.data?.error?.message ?? 'Failed to update results visibility.'
      );
    },
  });

  const assignFormMutation = useMutation({
    mutationFn: ({ id, evalFormId }: { id: string; evalFormId: string | null }) =>
      api.put(`/offerings/${id}`, { evalFormId: evalFormId || null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offerings'] }),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">Evaluation Windows</h1>
      {releaseError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive" role="alert">
          {releaseError}
        </div>
      )}
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && offerings?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No course offerings found.</p>
        )}
        {offerings?.map((o: any) => (
          <div key={o.id} className="bg-card border border-border rounded-lg p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-sm">{o.course?.code} — {o.course?.title}</div>
                <div className="text-xs text-muted-foreground">
                  {o.term?.name} · {o.instructor?.firstName} {o.instructor?.lastName} · Section {o.section}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> Open: {o.evalWindowOpen ? new Date(o.evalWindowOpen).toLocaleString() : 'Not set'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> Close: {o.evalWindowClose ? new Date(o.evalWindowClose).toLocaleString() : 'Not set'}
                  </span>
                </div>
                {/* Eval form assignment */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">Form:</span>
                  <select
                    value={o.evalFormId ?? ''}
                    onChange={e => assignFormMutation.mutate({ id: o.id, evalFormId: e.target.value || null })}
                    className="text-xs px-2 py-1 border border-input rounded bg-background"
                  >
                    <option value="">— No form assigned —</option>
                    {forms?.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.title} (v{f.version})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditing(o.id);
                    setWindowForm({
                      evalWindowOpen: o.evalWindowOpen?.slice(0, 16) ?? '',
                      evalWindowClose: o.evalWindowClose?.slice(0, 16) ?? '',
                    });
                  }}
                  className="px-3 py-1.5 text-xs border border-border rounded hover:bg-muted"
                >
                  Set Window
                </button>
                <button
                  onClick={() => releaseMutation.mutate({ id: o.id, release: !o.resultsReleased })}
                  className={`px-3 py-1.5 text-xs rounded ${
                    o.resultsReleased
                      ? 'bg-destructive/10 text-destructive border border-destructive/20'
                      : 'bg-green-100 text-green-700 border border-green-200'
                  }`}
                >
                  {o.resultsReleased ? 'Restrict Results' : 'Release Results'}
                </button>
              </div>
            </div>
            {editing === o.id && (
              <div className="border-t border-border pt-3 flex gap-3 items-end flex-wrap">
                <div>
                  <label className="block text-xs font-medium mb-1">Open Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    value={windowForm.evalWindowOpen}
                    onChange={e => setWindowForm(p => ({ ...p, evalWindowOpen: e.target.value }))}
                    className="px-3 py-2 border border-input rounded text-sm bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Close Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    value={windowForm.evalWindowClose}
                    onChange={e => setWindowForm(p => ({ ...p, evalWindowClose: e.target.value }))}
                    className="px-3 py-2 border border-input rounded text-sm bg-background"
                  />
                </div>
                <button
                  onClick={() => windowMutation.mutate({ id: o.id, data: windowForm })}
                  disabled={windowMutation.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
                >
                  {windowMutation.isPending ? 'Saving…' : 'Save Window'}
                </button>
                <button onClick={() => setEditing(null)} className="px-4 py-2 border border-border rounded text-sm">Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
