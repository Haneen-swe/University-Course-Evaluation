import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { BookOpen, Eye } from 'lucide-react';

export function FormsBuilderPage() {
  const qc = useQueryClient();
  const { data: forms, isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: () => api.get<{ success: true; data: any[] }>('/forms').then(r => r.data.data),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/forms/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => api.post(`/forms/${id}/clone`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">Evaluation Form Templates</h1>
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {forms?.map((f: any) => (
          <div key={f.id} className="bg-card border border-border rounded-lg p-5 flex items-start justify-between">
            <div>
              <div className="font-medium">{f.title}</div>
              <div className="text-xs text-muted-foreground mt-1">Version {f.version} · {f.questions?.length ?? 0} questions</div>
              <span className={`text-xs mt-2 inline-block px-2 py-0.5 rounded ${f.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {f.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {!f.isPublished && (
                <button onClick={() => publishMutation.mutate(f.id)} disabled={publishMutation.isPending}
                  className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded disabled:opacity-50">
                  Publish
                </button>
              )}
              <button onClick={() => cloneMutation.mutate(f.id)} className="px-3 py-1.5 text-xs border border-border rounded hover:bg-muted">
                Clone
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
