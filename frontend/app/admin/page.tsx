'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import AdminQueueItem, { QueueIssue } from '@/components/AdminQueueItem';

type Stats = {
  total_users: string;
  today_users: string;
  total_reports: string;
  pending_reports: string;
  approved_reports: string;
  rejected_reports: string;
  resolved_reports: string;
};

const STAT_CARDS: { key: keyof Stats; label: string }[] = [
  { key: 'total_users', label: 'Total users' },
  { key: 'today_users', label: "Today's new users" },
  { key: 'total_reports', label: 'Total reports' },
  { key: 'pending_reports', label: 'Pending review' },
  { key: 'approved_reports', label: 'Approved' },
  { key: 'rejected_reports', label: 'Rejected' },
  { key: 'resolved_reports', label: 'Resolved' },
];

export default function AdminQueuePage() {
  const [issues, setIssues] = useState<QueueIssue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getAdminQueue(), api.getAdminStats()])
      .then(([queueData, statsData]) => {
        setIssues(queueData.pendingIssues);
        setStats(statsData.stats);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {STAT_CARDS.map((card) => (
            <div key={card.key} className="rounded-card border border-ink/10 bg-white p-4">
              <p className="font-mono text-[11px] uppercase tracking-wide text-blueprint mb-1">{card.label}</p>
              <p className="font-display text-2xl font-bold text-ink">{stats[card.key]}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-display text-lg font-semibold text-ink mb-4">Pending review queue</h2>

      {loading && <p className="text-sm text-concrete font-mono">Loading queue…</p>}
      {error && <p className="text-sm text-rejected">{error}</p>}

      {!loading && !error && issues.length === 0 && (
        <p className="text-sm text-concrete font-mono border border-dashed border-ink/15 rounded-card p-6 text-center">
          Queue is empty — nothing waiting on review.
        </p>
      )}

      {issues.length > 0 && (
        <div className="space-y-3">
          {issues.map((issue) => (
            <AdminQueueItem
              key={issue.id}
              issue={issue}
              onResolved={(id) => setIssues((prev) => prev.filter((i) => i.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
