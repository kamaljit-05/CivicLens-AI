'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { LayoutList, Map as MapIcon } from 'lucide-react';
import IssueCard, { Issue } from './IssueCard';

// Leaflet touches `window` at import time, so the map view must never be
// pulled into the server-rendered bundle -- ssr:false + next/dynamic keeps
// it out of the initial HTML and only loads it once the user asks for it.
const IssueMap = dynamic(() => import('./IssueMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] rounded-card border border-ink/10 bg-ink/5 flex items-center justify-center text-sm font-mono text-concrete">
      Loading map…
    </div>
  ),
});

export default function IssuesBrowser({ issues }: { issues: Issue[] }) {
  const [view, setView] = useState<'list' | 'map'>('list');
  const mappable = issues.filter((i) => typeof i.lat === 'number' && typeof i.lng === 'number');

  return (
    <div>
      <div className="flex items-center gap-1 mb-5">
        <button
          type="button"
          onClick={() => setView('list')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium border transition-colors ${
            view === 'list' ? 'bg-ink text-white border-ink' : 'border-ink/15 text-ink hover:border-ink/40'
          }`}
        >
          <LayoutList size={15} /> List
        </button>
        <button
          type="button"
          onClick={() => setView('map')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium border transition-colors ${
            view === 'map' ? 'bg-ink text-white border-ink' : 'border-ink/15 text-ink hover:border-ink/40'
          }`}
        >
          <MapIcon size={15} /> Map
        </button>
      </div>

      {view === 'list' ? (
        issues.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        ) : (
          <p className="text-concrete text-sm font-mono">No approved reports match this filter yet.</p>
        )
      ) : (
        <IssueMap
          issues={mappable.map((i) => ({
            id: i.id,
            title: i.title,
            status: i.status,
            category_label: i.category_label,
            lat: i.lat as number,
            lng: i.lng as number,
          }))}
        />
      )}
    </div>
  );
}
