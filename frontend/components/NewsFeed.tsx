'use client';

import { useEffect, useState } from 'react';
import { Newspaper, MapPin, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

type Article = {
  title: string;
  url: string;
  source: string;
  summary?: string | null;
  publishedAt?: string;
};

type Scope = 'area' | 'city' | 'state' | 'country' | 'world';

type ResolvedPlace = { area?: string | null; city?: string | null; state?: string | null };

const TABS: { scope: Scope; label: string; needsPlace: boolean; fallbackLocale?: string }[] = [
  { scope: 'area', label: 'My Area', needsPlace: true },
  { scope: 'city', label: 'My City', needsPlace: true },
  { scope: 'state', label: 'My State', needsPlace: true },
  { scope: 'country', label: 'India', needsPlace: false, fallbackLocale: 'India' },
  { scope: 'world', label: 'World', needsPlace: false },
];

/**
 * Local News section — sourced only from a trusted-domain allowlist (see
 * backend news.service.js), each card clearly labeled by publisher so trust
 * is legible at a glance rather than asserted. Tries browser geolocation
 * first to personalize the Area/City/State tabs; falls back to a fixed
 * locale (via `fallbackCity`) if the user declines location access.
 */
export default function NewsFeed({ fallbackCity = 'Bhubaneswar' }: { fallbackCity?: string }) {
  const [scope, setScope] = useState<Scope>('city');
  const [place, setPlace] = useState<ResolvedPlace>({ city: fallbackCity });
  const [locating, setLocating] = useState(true);
  const [articlesByScope, setArticlesByScope] = useState<Partial<Record<Scope, Article[]>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve the visitor's location once on mount so the Area/City/State
  // tabs are personalized. Declining the browser prompt just falls back to
  // `fallbackCity` — the feed never blocks on this.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const resolved = await api.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          setPlace({ area: resolved.area, city: resolved.city || fallbackCity, state: resolved.state });
        } catch {
          // keep the fallback city already in state
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }, [fallbackCity]);

  useEffect(() => {
    if (locating) return; // wait for geolocation to settle before the first fetch
    if (articlesByScope[scope]) return; // already cached this tab

    const tab = TABS.find((t) => t.scope === scope)!;
    const locale = tab.needsPlace ? place[tab.scope as keyof ResolvedPlace] : tab.fallbackLocale;

    if (tab.needsPlace && !locale) {
      setArticlesByScope((prev) => ({ ...prev, [scope]: [] }));
      return;
    }

    setLoading(true);
    setError(null);
    api
      .getNews(scope, locale || undefined)
      .then((data) => setArticlesByScope((prev) => ({ ...prev, [scope]: data.articles })))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load news'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, locating, place]);

  const activeTab = TABS.find((t) => t.scope === scope)!;
  const missingPlace = activeTab.needsPlace && !place[activeTab.scope as keyof ResolvedPlace];
  const articles = articlesByScope[scope] || [];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.scope}
            type="button"
            onClick={() => setScope(tab.scope)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors ${
              scope === tab.scope ? 'bg-ink text-white border-ink' : 'border-ink/15 text-ink hover:border-ink/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {locating && scope !== 'world' && scope !== 'country' && (
        <p className="text-sm text-concrete font-mono mb-3 flex items-center gap-1.5">
          <MapPin size={13} /> Finding your location…
        </p>
      )}

      {!locating && missingPlace && (
        <p className="text-sm text-concrete font-mono flex items-center gap-1.5">
          <MapPin size={13} /> Allow location access (or set your city in your profile) to see {activeTab.label.toLowerCase()} headlines.
        </p>
      )}

      {error && (
        <p className="text-sm text-rejected flex items-center gap-1.5">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      {loading && <p className="text-sm text-concrete font-mono">Loading headlines…</p>}

      {!loading && !missingPlace && !error && articles.length === 0 && (
        <p className="text-sm text-concrete font-mono">No cached headlines for this tab yet.</p>
      )}

      {articles.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((a) => (
            <a
              key={a.url}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-card border border-ink/10 bg-white p-4 hover:border-blueprint/40 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide text-blueprint mb-2">
                <Newspaper size={12} /> {a.source}
              </div>
              <h4 className="font-display font-semibold text-sm text-ink leading-snug line-clamp-2 mb-1.5">
                {a.title}
              </h4>
              {a.summary && <p className="text-xs text-concrete line-clamp-3">{a.summary}</p>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
