import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rejected/10 text-rejected mb-6">
        <ShieldAlert size={26} />
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-rejected mb-3">403 · Access denied</p>
      <h1 className="font-display text-2xl font-bold text-ink mb-3">This area is admin-only</h1>
      <p className="text-concrete text-sm mb-8">
        The CivicLens admin dashboard is restricted to a specific set of Google accounts. If you believe
        you should have access, ask an existing admin to add your Gmail address to the backend&apos;s
        <code className="mx-1 rounded bg-ink/5 px-1.5 py-0.5 text-[13px]">ADMIN_EMAILS</code>
        environment variable.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-md bg-blueprint text-white text-sm font-medium px-5 py-2.5 hover:bg-ink transition-colors"
      >
        Back to CivicLens
      </Link>
    </div>
  );
}
