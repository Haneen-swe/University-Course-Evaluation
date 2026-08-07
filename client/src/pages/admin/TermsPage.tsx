import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export function TermsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', isActive: false });
  const [formError, setFormError] = useState('');

  const { data: terms, isLoading } = useQuery({
    queryKey: ['terms'],
    queryFn: () => api.get<{ success: true; data: any[] }>('/terms').then(r => r.data.data),
  });

  const resetForm = () => {
    setForm({ name: '', startDate: '', endDate: '', isActive: false });
    setFormError('');
    setEditId(null);
    setShowCreate(false);
  };

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => api.post('/terms', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['terms'] }); resetForm(); },
    onError: (e: any) => setFormError(e?.response?.data?.error?.message ?? 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) => api.put(`/terms/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['terms'] }); resetForm(); },
    onError: (e: any) => setFormError(e?.response?.data?.error?.message ?? 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/terms/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['terms'] }),
  });

  const startEdit = (t: any) => {
    setEditId(t.id);
    setShowCreate(true);
    setForm({
      name: t.name,
      startDate: t.startDate?.slice(0, 10) ?? '',
      endDate: t.endDate?.slice(0, 10) ?? '',
      isActive: t.isActive,
    });
    setFormError('');
  };

  const handleSubmit = () => {
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Terms</h1>
        <button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium"
        >
          <Plus size={16} /> Add Term
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-sm">{editId ? 'Edit Term' : 'Create New Term'}</h2>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Term Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Fall 2025"
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
              />
              <label htmlFor="isActive" className="text-xs font-medium">Active term</label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving…' : editId ? 'Update' : 'Create'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 border border-border rounded text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>{['Name', 'Start', 'End', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && terms?.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">No terms yet. Add one above.</td></tr>
            )}
            {terms?.map((t: any) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.startDate?.slice(0, 10)}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.endDate?.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    onClick={() => startEdit(t)}
                    className="text-muted-foreground hover:text-foreground p-1"
                    title="Edit term"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete term "${t.name}"?`)) {
                        deleteMutation.mutate(t.id);
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive p-1"
                    title="Delete term"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
