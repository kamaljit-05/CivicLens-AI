'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Copy, Users, ShieldCheck } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';

/**
 * Admin module — gated on both ends:
 *  - Here (client): unresolved/non-admin visitors never see the nav or any
 *    admin content, even briefly. Signed-out -> /login. Signed-in but not
 *    on the ADMIN_EMAILS allow-list -> /access-denied.
 *  - On the backend (authoritative): every /api/admin/* route requires
 *    requireAuth + requireAdmin, which re-checks the live allow-list on
 *    every request (see backend/src/middleware/auth.js). Even if someone
 *    bypassed this page entirely, the API would still refuse them with 403.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, user } = useCurrentUser();

  useEffect(() => {
    if (status === 'signed-out') {
      router.replace('/login');
    } else if (status === 'ready' && !user?.isAdmin) {
      router.replace('/access-denied');
    }
  }, [status, user, router]);

  if (status !== 'ready' || !user?.isAdmin) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-20 text-center text-sm text-concrete font-mono">
        Checking admin access…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl font-bold text-ink">Admin dashboard</h1>
        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-approved bg-approved/10 rounded-full px-3 py-1">
          <ShieldCheck size={13} /> {user.email}
        </span>
      </div>
      <p className="text-sm text-concrete mb-8">
        Signed in as an allow-listed admin. Actions here are logged to <code>admin_actions</code>.
      </p>

      <div className="flex items-center gap-1 mb-8 border-b border-ink/10">
        <Link href="/admin" className="flex items-center gap-1.5 px-3 py-2.5 rounded-t-md hover:bg-ink/5 text-ink/80 text-sm font-medium">
          <ClipboardList size={15} /> Pending reports
        </Link>
        <Link
          href="/admin/duplicates"
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-t-md hover:bg-ink/5 text-ink/80 text-sm font-medium"
        >
          <Copy size={15} /> Duplicate flags
        </Link>
        <Link
          href="/admin/users"
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-t-md hover:bg-ink/5 text-ink/80 text-sm font-medium"
        >
          <Users size={15} /> Users
        </Link>
      </div>

      {children}
    </div>
  );
}
