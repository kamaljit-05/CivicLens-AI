import Image from 'next/image';
import Link from 'next/link';
import StatusStamp from './StatusStamp';

export type Issue = {
  id: string;
  title: string;
  description: string;
  status: string;
  category?: string;
  category_label?: string;
  thumbnail_url?: string;
  created_at: string;
  lat?: number;
  lng?: number;
};

export default function IssueCard({ issue }: { issue: Issue }) {
  return (
    <Link
      href={`/issues/${issue.id}`}
      className="group block rounded-card border border-ink/10 bg-white overflow-hidden hover:border-blueprint/40 hover:shadow-md transition-all"
    >
      <div className="relative h-36 bg-ink/5">
        {issue.thumbnail_url ? (
          <Image src={issue.thumbnail_url} alt={issue.title} fill className="object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-concrete text-xs font-mono">
            NO IMAGE
          </div>
        )}
        <div className="absolute top-2 right-2">
          <StatusStamp status={issue.status} />
        </div>
      </div>
      <div className="p-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-blueprint mb-1">
          {issue.category_label || issue.category}
        </p>
        <h3 className="font-display font-semibold text-base text-ink leading-snug group-hover:text-blueprint">
          {issue.title}
        </h3>
        <p className="text-sm text-concrete mt-1 line-clamp-2">{issue.description}</p>
        <p className="font-mono text-[11px] text-concrete/70 mt-3">
          {new Date(issue.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </Link>
  );
}
