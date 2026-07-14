import ReportForm from '@/components/ReportForm';

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="text-center mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-blueprint mb-3">Add a problem</p>
        <h1 className="font-display text-3xl font-bold text-ink">Tell us what's wrong</h1>
        <p className="text-concrete mt-2">Four short steps — category, details, a photo, then review.</p>
      </div>
      <ReportForm />
    </div>
  );
}
