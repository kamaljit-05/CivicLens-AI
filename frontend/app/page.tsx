import Link from 'next/link';
import { PlusCircle, MapPinned, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import IssueCard, { Issue } from '@/components/IssueCard';
import NewsFeed from '@/components/NewsFeed';
import StatusStamp from '@/components/StatusStamp';

async function getRecentIssues(): Promise<Issue[]> {
  try {
    const { issues } = await api.listIssues({});
    return issues.slice(0, 6);
  } catch {
    return [];
  }
}

async function getNews() {
  try {
    const { articles } = await api.getLocalNews('Bhubaneswar');
    return articles;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [issues, news] = await Promise.all([getRecentIssues(), getNews()]);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-blueprint mb-4">
              Civic reporting, made instant
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-extrabold text-ink leading-[1.05] mb-5">
              See a problem in your city?
              <br />
              File it in under a minute.
            </h1>
            <p className="text-concrete text-lg mb-8 max-w-md">
              Snap a photo, add a note, and CivicLens routes it to the right department —
              with an AI-written summary attached, and a real person reviewing before it goes public.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/report"
                className="inline-flex items-center gap-2 rounded-md bg-blueprint text-white font-medium px-5 py-3 hover:bg-ink transition-colors"
              >
                <PlusCircle size={18} /> Add a problem
              </Link>
              <Link
                href="/issues"
                className="inline-flex items-center gap-2 rounded-md border border-ink/15 text-ink font-medium px-5 py-3 hover:border-ink/40 transition-colors"
              >
                <MapPinned size={18} /> Browse local issues
              </Link>
            </div>
          </div>

          {/* Signature element: a stamped report card, the visual thesis of the app */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-card border border-ink/10 bg-white shadow-xl p-5 rotate-2">
              <div className="h-40 rounded-md bg-ink/5 mb-4 flex items-center justify-center font-mono text-xs text-concrete">
                report photo
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-blueprint mb-1">Pothole</p>
              <h3 className="font-display font-semibold text-ink mb-1">Deep pothole, Jaydev Vihar Rd</h3>
              <p className="text-sm text-concrete mb-4">
                Reported 20 minutes ago · AI summary and suggested fix attached
              </p>
              <StatusStamp status="pending_review" />
            </div>
            <div className="absolute -bottom-6 -left-6 rounded-card border border-ink/10 bg-white shadow-lg p-3 -rotate-6 hidden sm:block">
              <StatusStamp status="approved" />
            </div>
          </div>
        </div>
      </section>

      {/* Recent issues */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-ink">Recently reported nearby</h2>
          <Link href="/issues" className="text-sm font-medium text-blueprint inline-flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {issues.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        ) : (
          <p className="text-concrete text-sm font-mono">
            No approved reports yet — connect the backend and database to see live issues here.
          </p>
        )}
      </section>

      {/* Local news */}
      <section className="border-t border-ink/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="font-display text-2xl font-bold text-ink mb-1">Local news</h2>
          <p className="text-sm text-concrete mb-6">Sourced from vetted newspapers only — no aggregator noise.</p>
          <NewsFeed articles={news} />
        </div>
      </section>
    </div>
  );
}
