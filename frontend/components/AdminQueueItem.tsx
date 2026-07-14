'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, X } from 'lucide-react';
import { api } from '@/lib/api';

export type QueueIssue = {
  id: string;
  title: string;
  description: string;
  status: string;
  category_label: string;
  reported_by: string;
  thumbnail_url?: string;
  ai_summary?: string;
  created_at: string;
};

export default function AdminQueueItem({ issue, onResolved }: { issue: QueueIssue; onResolved: (id: string) => void }) {
  const [busy, setBusy] = useState(false);

  async function handle(action: 'approve' | 'reject') {
    setBusy(true);
    try {
      if (action === 'approve') await api.approveIssue(issue.id);
      else await api.rejectIssue(issue.id);
      onResolved(issue.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-ink/10 bg-white p-4 flex gap-4">
      <div className="relative h-20 w-20 shrink-0 rounded-md overflow-hidden bg-ink/5">
        {issue.thumbnail_url && <Image src={issue.thumbnail_url} alt={issue.title} fill className="object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-wide text-blueprint">{issue.category_label}</p>
        <h3 className="font-display font-semibold text-ink truncate">{issue.title}</h3>
        <p className="text-sm text-concrete line-clamp-2">{issue.description}</p>
        <p className="text-xs text-concrete/70 mt-1">
          Reported by {issue.reported_by} ·{' '}
          {new Date(issue.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
        </p>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <button
          onClick={() => handle('approve')}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md bg-approved text-white text-xs font-semibold px-3 py-2 hover:opacity-90 disabled:opacity-50"
        >
          <Check size={14} /> Approve
        </button>
        <button
          onClick={() => handle('reject')}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-rejected text-rejected text-xs font-semibold px-3 py-2 hover:bg-rejected/5 disabled:opacity-50"
        >
          <X size={14} /> Reject
        </button>
      </div>
    </div>
  );
}
