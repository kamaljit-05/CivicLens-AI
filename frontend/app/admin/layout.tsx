import Link from 'next/link';
import { ClipboardList, Copy } from 'lucide-react';

/**
 * Admin module — kept as a route group inside the same Next.js app rather
 * than a separate project, gated by requireAdmin on every backend call.
 * A data-dense, low-decoration register is intentional here: this is an
 * internal review tool, not a public-facing page.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Review queue</h1>
        <nav className="flex gap-1 text-sm font-medium">
          <Link href="/admin" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-ink/5 text-ink/80">
            <ClipboardList size={15} /> Pending reports
          </Link>
          <Link
            href="/admin/duplicates"
            className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-ink/5 text-ink/80"
          >
            <Copy size={15} /> Duplicate flags
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
