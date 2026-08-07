import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { Plus, Pencil } from 'lucide-react';

export function DepartmentsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', headId: '' });
  const [formError, setFormError] = useState('');

  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get<{ success: true; data: any[] }>('/departments').then(r => r.data.data),
  });

  const { data: instructors } = useQuery({
    queryKey: ['users', 'instructors'],
    queryFn: () =>
      api.get<{ success: true; data: any[] }>('/users?role=instructor').then(r => r.data.data),
  });

  const resetForm = () => {
    setForm({ name: '', code: '', headId: '' });
    setFormError('');
    setEditId(null);
    setShowCreate(false);
  };

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => {
      const body: any = { name: payload.name, code: payload.code };
      if (payload.headId) body.headId = payload.headId;
      return api.post('/departments', body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); resetForm(); },
    onError: (e: any) => setFormError(e?.response?.data?.error?.message ?? 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) => {
      const body: any = {};
      if (data.name) body.name = data.name;
      if (data.code) body.code = data.code;
      if (data.headId) body.headId = data.headId;
      return api.put(`/departments/${id}`, body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); resetForm(); },
    onError: (e: any) => setFormError(e?.response?.data?.error?.message ?? 'Update failed'),
  });

  const startEdit = (d: any) => {
    setEditId(d.id);
    setShowCreate(true);
    setForm({ name: d.name, code: d.code, headId: d.headId ?? '' });
    setFormError('');
  };

  const handleSubmit = () => {
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  // Merge dept_head users for head assignment
  const { data: deptHeads } = useQuery({
    queryKey: ['users', 'dept_head'],
    queryFn: () =>
      api.get<{ success: true; data: any[] }>('/users?role=dept_head').then(r => r.data.data),
  });
  const headOptions = [
    ...(instructors ?? []),
    ...(deptHeads ?? []),
  ].filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Departments</h1>
        <button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium"
        >
          <Plus size={16} /> Add Department
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-sm">{editId ? 'Edit Department' : 'Create New Department'}</h2>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Department Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Computer Science"
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Department Code</label>
              <input
                type="text"
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                placeholder="e.g. CS"
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Department Head (optional)</label>
              <select
                value={form.headId}
                onChange={e => setForm(p => ({ ...p, headId: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              >
                <option value="">— No head assigned —</option>
                {headOptions.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
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
            <tr>{['Name', 'Code', 'Head', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && departments?.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">No departments yet. Add one above.</td></tr>
            )}
            {departments?.map((d: any) => (
              <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{d.code}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {d.head ? `${d.head.firstName} ${d.head.lastName}` : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => startEdit(d)}
                    className="text-muted-foreground hover:text-foreground p-1"
                    title="Edit department"
                  >
                    <Pencil size={14} />
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
