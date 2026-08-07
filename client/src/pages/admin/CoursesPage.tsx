import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { Plus, Archive } from 'lucide-react';

export function CoursesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: '', title: '', credits: 3, departmentId: '' });
  const [formError, setFormError] = useState('');

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get<{ success: true; data: any[] }>('/courses').then(r => r.data.data),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get<{ success: true; data: any[] }>('/departments').then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => api.post('/courses', { ...payload, credits: Number(payload.credits) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      setShowCreate(false);
      setForm({ code: '', title: '', credits: 3, departmentId: '' });
      setFormError('');
    },
    onError: (e: any) => setFormError(e?.response?.data?.error?.message ?? 'Create failed'),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/courses/${id}`, { isArchived: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Courses</h1>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium"
        >
          <Plus size={16} /> Add Course
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-sm">Create New Course</h2>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Course Code</label>
              <input
                type="text"
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                placeholder="e.g. CS301"
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Data Structures"
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Credits</label>
              <input
                type="number"
                min={1}
                max={6}
                value={form.credits}
                onChange={e => setForm(p => ({ ...p, credits: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Department</label>
              <select
                value={form.departmentId}
                onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              >
                <option value="">Select department…</option>
                {departments?.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border rounded text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>{['Code', 'Title', 'Credits', 'Department', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</td></tr>
            )}
            {courses?.map((c: any) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3 font-mono text-xs font-medium">{c.code}</td>
                <td className="px-4 py-3">{c.title}</td>
                <td className="px-4 py-3 text-center">{c.credits}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.department?.name}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => {
                      if (window.confirm(`Archive "${c.code} — ${c.title}"? This will hide it from new offerings.`)) {
                        archiveMutation.mutate(c.id);
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                    title="Archive course"
                  >
                    <Archive size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && courses?.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">No courses yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
