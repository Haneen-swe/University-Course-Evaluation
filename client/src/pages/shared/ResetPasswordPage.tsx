import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '@/features/auth/api';

const schema = z.object({
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
type FormData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: ({ newPassword }: FormData) => authApi.resetPassword(token, newPassword),
    onSuccess: () => { setTimeout(() => navigate('/login'), 2000); },
  });
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-8">
        <h1 className="text-xl font-bold mb-6">Set new password</h1>
        {mutation.isSuccess
          ? <div className="p-4 bg-green-50 border border-green-200 rounded text-sm text-green-800">Password updated! Redirecting to sign in…</div>
          : (
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              {mutation.isError && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">Invalid or expired token.</div>}
              <div>
                <label className="block text-sm font-medium mb-1">New password</label>
                <input type="password" {...register('newPassword')} className="w-full px-3 py-2 border border-input rounded-md text-sm" />
                {errors.newPassword && <p className="mt-1 text-xs text-destructive">Min 8 chars, uppercase, lowercase, number</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm password</label>
                <input type="password" {...register('confirmPassword')} className="w-full px-3 py-2 border border-input rounded-md text-sm" />
                {errors.confirmPassword && <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>}
              </div>
              <button type="submit" disabled={mutation.isPending} className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50">
                {mutation.isPending ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )
        }
        <p className="text-sm text-center mt-4"><Link to="/login" className="text-primary hover:underline">Back to sign in</Link></p>
      </div>
    </div>
  );
}
