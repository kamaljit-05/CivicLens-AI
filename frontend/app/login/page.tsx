'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { api } from '@/lib/api';

// Minimal shape of the Google Identity Services global we need — the real
// script attaches `google` to window at runtime, there's no official npm
// package of types bundled with this starter kit.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Step 1 of onboarding: Google Sign-In. Nothing implemented this in the
 * starter kit — /app/onboarding/page.tsx (step 2, profile completion)
 * assumed a session token already existed. This page gets a Google ID token
 * via Google Identity Services, exchanges it with the backend
 * (POST /api/auth/google) for a session JWT, stores it, and routes the user
 * into profile setup (new users) or straight home (returning users).
 */
export default function LoginPage() {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);

  async function handleCredentialResponse(resp: { credential: string }) {
    setExchanging(true);
    setError(null);
    try {
      const { token, user, isNewUser } = await api.signInWithGoogle(resp.credential);
      window.localStorage.setItem('civiclens_token', token);
      if (isNewUser || !user.profile_completed) {
        router.push('/onboarding');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
      setExchanging(false);
    }
  }

  useEffect(() => {
    if (!scriptLoaded || !CLIENT_ID || !buttonRef.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredentialResponse,
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 300,
      text: 'signin_with',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded]);

  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-blueprint mb-3">Welcome</p>
      <h1 className="font-display text-2xl font-bold text-ink mb-2">Sign in to CivicLens</h1>
      <p className="text-concrete text-sm mb-8">
        We use Google Sign-In so you never have to create or remember another password.
      </p>

      {!CLIENT_ID ? (
        <p className="text-sm text-rejected bg-rejected/5 border border-rejected/20 rounded-md p-4">
          Google sign-in isn&apos;t configured yet — <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> is missing from
          this deployment&apos;s environment variables.
        </p>
      ) : (
        <>
          <Script
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
            onLoad={() => setScriptLoaded(true)}
          />
          <div className="flex justify-center">
            <div ref={buttonRef} />
          </div>
          {exchanging && <p className="text-sm text-concrete mt-4">Signing you in…</p>}
          {error && <p className="text-sm text-rejected mt-4">{error}</p>}
        </>
      )}
    </div>
  );
}
