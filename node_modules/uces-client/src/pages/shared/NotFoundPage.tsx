import { Link } from 'react-router-dom';
export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">This page does not exist.</p>
      <Link to="/" className="text-primary hover:underline text-sm">Go home</Link>
    </div>
  );
}
