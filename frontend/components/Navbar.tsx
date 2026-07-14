'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, PlusCircle, LayoutDashboard, LogIn, LogOut } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  // Starts null on both server and client's first render so hydration
  // matches; the real value is filled in after mount (localStorage only
  // exists in the browser).
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setSignedIn(!!window.localStorage.getItem('civiclens_token'));
  }, []);

  function handleLogout() {
    window.localStorage.removeItem('civiclens_token');
    setSignedIn(false);
    router.push('/');
    router.refresh();
  }

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

          {signedIn === null ? null : signedIn ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-ink/5 text-ink/60 ml-1"
            >
              <LogOut size={16} /> Log out
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-ink/15 text-ink hover:border-ink/40 ml-1"
            >
              <LogIn size={16} /> Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
