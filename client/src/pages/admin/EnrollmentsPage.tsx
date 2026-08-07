import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { UserPlus, UserMinus } from 'lucide-react';

export function EnrollmentsPage() {
  const qc = useQueryClient();
  const [selectedOfferingId, setSelectedOfferingId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [enrollError, setEnrollError] = useState('');

  const { data: offerings, isLoading: offeringsLoading } = useQuery({
    queryKey: ['offerings'],
    queryFn: () => api.get<{ success: true; data: any[] }>('/offerings').then(r => r.data.data),
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['enrollments', selectedOfferingId],
    queryFn: () =>
      api
        .get<{ success: true; data: any[] }>(`/enrollments/offerings/${selectedOfferingId}/students`)
        .then(r => r.data.data),
    enabled: !!selectedOfferingId,
  });

  const { data: students } = useQuery({
    queryKey: ['users', 'students', studentSearch],
    queryFn: () => {
      const params = new URLSearchParams({ role: 'student' });
      if (studentSearch) params.set('search', studentSearch);
      return api.get<{ success: true; data: any[] }>(`/users?${params.toString()}`).then(r => r.data.data);
    },
  });

  const enrollMutation = useMutation({
    mutationFn: ({ offeringId, studentId }: { offeringId: string; studentId: string }) =>
      api.post(`/enrollments/offerings/${offeringId}/students`, { studentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments', selectedOfferingId] });
      setEnrollError('');
    },
    onError: (e: any) => setEnrollError(e?.response?.data?.error?.message ?? 'Enrollment failed'),
  });

  const unenrollMutation = useMutation({
    mutationFn: ({ offeringId, studentId }: { offeringId: string; studentId: string }) =>
      api.delete(`/enrollments/offerings/${offeringId}/students/${studentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments', selectedOfferingId] }),
  });

  const enrolledIds = new Set(enrollments?.map((e: any) => e.student?.id) ?? []);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">Enrollment Management</h1>

      {/* Offering selector */}
      <div>
        <label className="block text-xs font-medium mb-1 text-muted-foreground">Select Course Offering</label>
        <select
          value={selectedOfferingId}
          onChange={e => { setSelectedOfferingId(e.target.value); setEnrollError(''); }}
          className="px-3 py-2 border border-input rounded text-sm bg-background w-full max-w-lg"
        >
          <option value="">— Choose an offering —</option>
          {offeringsLoading && <option disabled>Loading…</option>}
          {offerings?.map((o: any) => (
            <option key={o.id} value={o.id}>
              {o.course?.code} — {o.course?.title} · {o.term?.name} · Section {o.section}
            </option>
          ))}
        </select>
      </div>

      {selectedOfferingId && (
        <div className="grid grid-cols-2 gap-6">
          {/* Enrolled students */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Enrolled ({enrollments?.length ?? 0})
            </h2>
            <div className="border border-border rounded-lg overflow-hidden">
              {enrollmentsLoading && (
                <p className="px-4 py-4 text-xs text-muted-foreground">Loading…</p>
              )}
              {!enrollmentsLoading && enrollments?.length === 0 && (
                <p className="px-4 py-4 text-xs text-muted-foreground">No students enrolled.</p>
              )}
              {enrollments?.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{e.student?.firstName} {e.student?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{e.student?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Remove ${e.student?.firstName} ${e.student?.lastName} from this offering?`)) {
                        unenrollMutation.mutate({ offeringId: selectedOfferingId, studentId: e.student?.id });
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive p-1"
                    title="Remove enrollment"
                  >
                    <UserMinus size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Available students to enroll */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Students</h2>
            {enrollError && <p className="text-xs text-destructive">{enrollError}</p>}
            <input
              type="text"
              placeholder="Search students…"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
            />
            <div className="border border-border rounded-lg overflow-hidden">
              {students?.filter((s: any) => !enrolledIds.has(s.id)).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40">
                  <div>
                    <p className="text-sm font-medium">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <button
                    onClick={() => enrollMutation.mutate({ offeringId: selectedOfferingId, studentId: s.id })}
                    disabled={enrollMutation.isPending}
                    className="text-muted-foreground hover:text-green-600 p-1 disabled:opacity-50"
                    title="Enroll student"
                  >
                    <UserPlus size={15} />
                  </button>
                </div>
              ))}
              {students?.filter((s: any) => !enrolledIds.has(s.id)).length === 0 && (
                <p className="px-4 py-4 text-xs text-muted-foreground">All matching students are already enrolled.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
