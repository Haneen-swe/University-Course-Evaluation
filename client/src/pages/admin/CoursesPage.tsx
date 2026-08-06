import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

export function CoursesPage() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get<{ success: true; data: any[] }>('/courses').then(r => r.data.data),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">Courses</h1>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>{['Code', 'Title', 'Credits', 'Department'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</td></tr>}
            {courses?.map((c: any) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3 font-mono text-xs font-medium">{c.code}</td>
                <td className="px-4 py-3">{c.title}</td>
                <td className="px-4 py-3 text-center">{c.credits}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.department?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
