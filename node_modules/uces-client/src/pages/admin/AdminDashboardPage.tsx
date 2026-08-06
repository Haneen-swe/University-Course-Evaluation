import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { useCurrentUser } from '@/features/auth/store';
import { BarChart3, Users, BookOpen, ClipboardList } from 'lucide-react';

export function AdminDashboardPage() {
  const user = useCurrentUser();
  const { data: stats } = useQuery({
    queryKey: ['institution-report'],
    queryFn: () => api.get<{ success: true; data: any }>('/reports/institution').then(r => r.data.data),
    enabled: user?.role === 'admin',
  });

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers ?? '…', icon: <Users size={20} /> },
    { label: 'Active Courses', value: stats?.totalCourses ?? '…', icon: <BookOpen size={20} /> },
    { label: 'Offerings', value: stats?.totalOfferings ?? '…', icon: <ClipboardList size={20} /> },
    { label: 'Total Submissions', value: stats?.totalSubmissions ?? '…', icon: <BarChart3 size={20} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of UCES activity.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground">{c.icon}</div>
              <div>
                <div className="text-2xl font-bold">{c.value}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-semibold text-sm mb-3">Recent Terms</h2>
        <div className="space-y-2">
          {stats?.recentTerms?.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
              <span>{t.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>{t.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
