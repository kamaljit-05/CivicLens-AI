'use client';

import { useEffect, useState } from 'react';
import { GitMerge, X, Link2Off } from 'lucide-react';
import { api } from '@/lib/api';

type DuplicateFlag = {
  id: string;
  similarity_score: number;
  issue_id: string;
  new_issue_title: string;
  matched_issue_id: string;
  matched_issue_title: string;
};

export default function DuplicatesPage() {
  const [flags, setFlags] = useState<DuplicateFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAdminQueue()
      .then((data) => setFlags(data.duplicateFlags))
      .finally(() => setLoading(false));
  }, []);

  async function resolve(flagId: string, resolution: string) {
    setBusyId(flagId);
    try {
      await api.resolveDuplicate(flagId, resolution);
      setFlags((prev) => prev.filter((f) => f.id !== flagId));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="text-sm text-concrete font-mono">Loading duplicate flags…</p>;

  if (flags.length === 0) {
    return (
      <p className="text-sm text-concrete font-mono border border-dashed border-ink/15 rounded-card p-6 text-center">
        No open duplicate flags right now.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-concrete mb-2">
        The system never merges automatically — confirm, dismiss, or mark each pair as related below.
      </p>
      {flags.map((flag) => (
        <div key={flag.id} className="rounded-card border border-ink/10 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs uppercase tracking-wide text-blueprint">
              Similarity {(flag.similarity_score * 100).toFixed(0)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-[11px] font-mono uppercase text-concrete mb-1">New report</p>
              <p className="text-ink font-medium">{flag.new_issue_title}</p>
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase text-concrete mb-1">Existing report</p>
              <p className="text-ink font-medium">{flag.matched_issue_title}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => resolve(flag.id, 'confirmed_merge')}
              disabled={busyId === flag.id}
              className="inline-flex items-center gap-1 rounded-md bg-blueprint text-white text-xs font-semibold px-3 py-2 hover:bg-ink disabled:opacity-50"
            >
              <GitMerge size={14} /> Confirm duplicate
            </button>
            <button
              onClick={() => resolve(flag.id, 'marked_related')}
              disabled={busyId === flag.id}
              className="inline-flex items-center gap-1 rounded-md border border-ink/15 text-ink text-xs font-semibold px-3 py-2 hover:border-ink/40 disabled:opacity-50"
            >
              <Link2Off size={14} /> Related, not duplicate
            </button>
            <button
              onClick={() => resolve(flag.id, 'rejected_as_duplicate')}
              disabled={busyId === flag.id}
              className="inline-flex items-center gap-1 rounded-md border border-rejected text-rejected text-xs font-semibold px-3 py-2 hover:bg-rejected/5 disabled:opacity-50"
            >
              <X size={14} /> Not a duplicate
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
