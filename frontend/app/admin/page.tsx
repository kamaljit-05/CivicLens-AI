'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import AdminQueueItem, { QueueIssue } from '@/components/AdminQueueItem';

export default function AdminQueuePage() {
  const [issues, setIssues] = useState<QueueIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAdminQueue()
      .then((data) => setIssues(data.pendingIssues))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-concrete font-mono">Loading queue…</p>;
  if (error) return <p className="text-sm text-rejected">{error}</p>;

  if (issues.length === 0) {
    return (
      <p className="text-sm text-concrete font-mono border border-dashed border-ink/15 rounded-card p-6 text-center">
        Queue is empty — nothing waiting on review.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <AdminQueueItem
          key={issue.id}
          issue={issue}
          onResolved={(id) => setIssues((prev) => prev.filter((i) => i.id !== id))}
        />
      ))}
    </div>
  );
}
