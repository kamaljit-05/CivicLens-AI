import { api } from '@/lib/api';
import IssueCard, { Issue } from '@/components/IssueCard';

const CATEGORIES = [
  { slug: '', label: 'All' },
  { slug: 'pothole', label: 'Pothole' },
  { slug: 'streetlight', label: 'Streetlight' },
  { slug: 'garbage', label: 'Garbage' },
  { slug: 'water_leak', label: 'Water Leak' },
  { slug: 'drainage', label: 'Drainage' },
];

async function getIssues(category?: string): Promise<Issue[]> {
  try {
    const { issues } = await api.listIssues(category ? { category } : {});
    return issues;
  } catch {
    return [];
  }
}

export default async function IssuesPage({ searchParams }: { searchParams: { category?: string } }) {
  const activeCategory = searchParams.category || '';
  const issues = await getIssues(activeCategory || undefined);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-blueprint mb-3">Browse</p>
        <h1 className="font-display text-3xl font-bold text-ink mb-6">Local issues</h1>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <a
              key={c.slug}
              href={c.slug ? `/issues?category=${c.slug}` : '/issues'}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors ${
                activeCategory === c.slug
                  ? 'bg-ink text-white border-ink'
                  : 'border-ink/15 text-ink hover:border-ink/40'
              }`}
            >
              {c.label}
            </a>
          ))}
        </div>
      </div>

      {issues.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      ) : (
        <p className="text-concrete text-sm font-mono">No approved reports match this filter yet.</p>
      )}
    </div>
  );
}
