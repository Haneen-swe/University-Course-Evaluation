import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { Plus, Trash2 } from 'lucide-react';

export function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    email: '', firstName: '', lastName: '', role: 'student', password: '', departmentId: '',
  });
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      return api
        .get<{ success: true; data: any[]; pagination: any }>(`/users?${params.toString()}`)
        .then((r) => r.data.data);
    },
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get<{ success: true; data: any[] }>('/departments').then(r => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => {
      const body: any = {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role,
      };
      if (payload.password) body.password = payload.password;
      if (payload.departmentId) body.departmentId = payload.departmentId;
      return api.post('/users', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setForm({ email: '', firstName: '', lastName: '', role: 'student', password: '', departmentId: '' });
      setFormError('');
    },
    onError: (e: any) => setFormError(e?.response?.data?.error?.message ?? 'Create failed'),
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete user "${name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-sm">Create New User</h2>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <div className="grid grid-cols-2 gap-3">
            {(['email', 'firstName', 'lastName', 'password'] as const).map(f => (
              <div key={f}>
                <label className="block text-xs font-medium mb-1 capitalize">
                  {f === 'password' ? 'Password (min 8 chars)' : f.replace(/([A-Z])/g, ' $1')}
                </label>
                <input
                  type={f === 'password' ? 'password' : 'text'}
                  value={form[f]}
                  onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium mb-1">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="dept_head">Department Head</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Department (optional)</label>
              <select
                value={form.departmentId}
                onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              >
                <option value="">No department</option>
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

      {/* Filters */}
      <div className="flex gap-3">
        <input
          placeholder="Search name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-input rounded text-sm bg-background w-60"
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-input rounded text-sm bg-background"
        >
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
          <option value="dept_head">Dept Head</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>{['Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-xs">Loading…</td></tr>
            )}
            {!isLoading && data?.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">No users found.</td></tr>
            )}
            {data?.map((u: any) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3 font-medium">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3 capitalize">{u.role.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(u.id, `${u.firstName} ${u.lastName}`)}
                    className="text-destructive hover:opacity-70 p-1"
                    title="Delete user"
                  >
                    <Trash2 size={15} />
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
