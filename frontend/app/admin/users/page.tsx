'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Ban, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  occupation: string | null;
  photo_url: string | null;
  city: string | null;
  district: string | null;
  role: string;
  is_suspended: boolean;
  profile_completed: boolean;
  created_at: string;
  reports_submitted: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api
      .getAdminUsers()
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function toggleSuspend(user: AdminUser) {
    setActingOn(user.id);
    try {
      if (user.is_suspended) {
        await api.unsuspendUser(user.id);
      } else {
        await api.suspendUser(user.id);
      }
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_suspended: !u.is_suspended } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActingOn(null);
    }
  }

  if (loading) return <p className="text-sm text-concrete font-mono">Loading users…</p>;
  if (error) return <p className="text-sm text-rejected">{error}</p>;

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-ink mb-4">
        Registered users <span className="text-concrete font-normal text-sm">({users.length})</span>
      </h2>

      <div className="rounded-card border border-ink/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-[11px] font-mono uppercase tracking-wide text-concrete">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Occupation</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Reports</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-ink/10 overflow-hidden shrink-0 relative">
                      {u.photo_url && <Image src={u.photo_url} alt={u.name} fill className="object-cover" />}
                    </div>
                    <div>
                      <p className="font-medium text-ink flex items-center gap-1">
                        {u.name}
                        {u.role === 'admin' && (
                          <ShieldCheck size={13} className="text-blueprint" aria-label="Admin" />
                        )}
                      </p>
                      <p className="text-xs text-concrete">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-concrete">{u.occupation || '—'}</td>
                <td className="px-4 py-3 text-concrete">{[u.city, u.district].filter(Boolean).join(', ') || '—'}</td>
                <td className="px-4 py-3 font-mono text-ink">{u.reports_submitted}</td>
                <td className="px-4 py-3 text-concrete font-mono text-xs">
                  {new Date(u.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  {u.is_suspended ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-rejected bg-rejected/10 rounded-full px-2.5 py-1">
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-approved bg-approved/10 rounded-full px-2.5 py-1">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role === 'admin' ? (
                    <span className="text-xs text-concrete font-mono">admin</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleSuspend(u)}
                      disabled={actingOn === u.id}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                        u.is_suspended
                          ? 'bg-approved/10 text-approved hover:bg-approved/20'
                          : 'bg-rejected/10 text-rejected hover:bg-rejected/20'
                      }`}
                    >
                      {u.is_suspended ? (
                        <>
                          <CheckCircle2 size={13} /> Unsuspend
                        </>
                      ) : (
                        <>
                          <Ban size={13} /> Suspend
                        </>
                      )}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
