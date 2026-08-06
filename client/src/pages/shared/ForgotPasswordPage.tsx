import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { authApi } from '@/features/auth/api';

const schema = z.object({ email: z.string().email('Valid email required') });
type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const mutation = useMutation({ mutationFn: ({ email }: FormData) => authApi.forgotPassword(email) });
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-8">
        <h1 className="text-xl font-bold mb-1">Reset your password</h1>
        <p className="text-sm text-muted-foreground mb-6">Enter your institutional email to receive a reset link.</p>
        {mutation.isSuccess
          ? <div className="p-4 bg-green-50 border border-green-200 rounded text-sm text-green-800" role="alert">If that email exists in our system, a reset link has been sent.</div>
          : (
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium mb-1">Email address</label>
                <input id="email" type="email" {...register('email')} className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background" />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <button type="submit" disabled={mutation.isPending} className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50">
                {mutation.isPending ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          )
        }
        <p className="text-sm text-center mt-4"><Link to="/login" className="text-primary hover:underline">Back to sign in</Link></p>
      </div>
    </div>
  );
}
