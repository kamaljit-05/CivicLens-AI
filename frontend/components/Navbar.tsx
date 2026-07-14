import Link from 'next/link';
import { MapPin, PlusCircle, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="border-b border-ink/10 bg-paper/95 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        <Link href="/" className="font-display font-bold text-xl tracking-tight text-ink flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 bg-signal rounded-full" aria-hidden />
          CivicLens
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/issues" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-ink/5 text-ink/80">
            <MapPin size={16} /> Browse
          </Link>
          <Link
            href="/report"
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blueprint text-white hover:bg-ink transition-colors"
          >
            <PlusCircle size={16} /> Report an issue
          </Link>
          <Link href="/admin" className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-ink/5 text-ink/60">
            <LayoutDashboard size={16} /> Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
