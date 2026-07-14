import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import StatusStamp from '@/components/StatusStamp';

async function getIssue(id: string) {
  try {
    return await api.getIssue(id);
  } catch {
    return null;
  }
}

export default async function IssueDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { submitted?: string };
}) {
  const data = await getIssue(params.id);

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <p className="text-concrete">This report couldn't be found.</p>
      </div>
    );
  }

  const { issue, images } = data;

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      {searchParams.submitted && (
        <div className="mb-6 flex items-center gap-2 rounded-md bg-approved/10 text-approved px-4 py-3 text-sm font-medium">
          <CheckCircle2 size={18} />
          Your report was received — it's in the review queue now.
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-xs uppercase tracking-widest text-blueprint">{issue.category_label}</p>
        <StatusStamp status={issue.status} />
      </div>

      <h1 className="font-display text-3xl font-bold text-ink mb-4">{issue.title}</h1>

      {images?.[0]?.url && (
        <div className="relative h-64 rounded-card overflow-hidden bg-ink/5 mb-6">
          <Image src={images[0].url} alt={issue.title} fill className="object-cover" />
        </div>
      )}

      <p className="text-ink leading-relaxed mb-6">{issue.description}</p>

      {issue.ai_summary && (
        <div className="rounded-card border border-blueprint/25 bg-blueprint/5 p-5 mb-6">
          <p className="font-mono text-[11px] uppercase tracking-wide text-blueprint mb-1">AI summary</p>
          <p className="text-sm text-ink leading-relaxed mb-3">{issue.ai_summary}</p>
          {issue.ai_suggestion && (
            <>
              <p className="font-mono text-[11px] uppercase tracking-wide text-blueprint mb-1">Suggested fix</p>
              <p className="text-sm text-ink leading-relaxed">{issue.ai_suggestion}</p>
            </>
          )}
        </div>
      )}

      {issue.solution_idea && (
        <div className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-wide text-blueprint mb-1">Reporter's suggestion</p>
          <p className="text-sm text-ink">{issue.solution_idea}</p>
        </div>
      )}

      <p className="font-mono text-xs text-concrete/70">
        Reported {new Date(issue.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}
