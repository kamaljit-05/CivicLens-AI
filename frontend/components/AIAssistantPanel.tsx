'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

type AIResult = {
  summary: string;
  suggestion: string;
  imageAuthenticity?: { isAiGenerated: boolean | null; confidence: number };
};

/**
 * The "AI Assistance" panel: after the reporter has picked a photo and typed
 * a title/description, this calls the backend (which in turn calls the AI
 * microservice) for a 100-150 word summary, a suggested fix, and an
 * authenticity read on the photo — surfaced here before final submission.
 */
export default function AIAssistantPanel({
  onAnalyze,
}: {
  onAnalyze: () => Promise<AIResult>;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await onAnalyze();
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analysis failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-card border border-blueprint/25 bg-blueprint/5 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={18} className="text-blueprint" />
        <h3 className="font-display font-semibold text-ink">AI assistant</h3>
      </div>

      {!result && (
        <>
          <p className="text-sm text-concrete mb-3">
            Get a clear summary and a suggested fix generated from your photo and description —
            useful context for the reviewing department.
          </p>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-blueprint text-white text-sm font-medium px-4 py-2 hover:bg-ink transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Analyzing…' : 'Analyze with AI'}
          </button>
        </>
      )}

      {error && <p className="text-sm text-rejected mt-2">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-blueprint mb-1">Summary</p>
            <p className="text-sm text-ink leading-relaxed">{result.summary}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-blueprint mb-1">Suggested fix</p>
            <p className="text-sm text-ink leading-relaxed">{result.suggestion}</p>
          </div>
          {result.imageAuthenticity && (
            <div className="flex items-center gap-2 text-xs pt-1">
              {result.imageAuthenticity.isAiGenerated ? (
                <>
                  <ShieldAlert size={14} className="text-rejected" />
                  <span className="text-rejected">Photo flagged for authenticity review</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} className="text-approved" />
                  <span className="text-approved">No AI-generation signals detected</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
