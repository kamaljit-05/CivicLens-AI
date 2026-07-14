import { Newspaper } from 'lucide-react';

type Article = {
  title: string;
  url: string;
  source: string;
  published_at?: string;
};

/**
 * Local News section — sourced only from a trusted-domain allowlist (see
 * backend news.service.js), each card clearly labeled by publisher so trust
 * is legible at a glance rather than asserted.
 */
export default function NewsFeed({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return (
      <p className="text-sm text-concrete font-mono">No local headlines cached yet for this area.</p>
    );
  }

  return (
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
          <h4 className="font-display font-semibold text-sm text-ink leading-snug line-clamp-3">{a.title}</h4>
        </a>
      ))}
    </div>
  );
}
