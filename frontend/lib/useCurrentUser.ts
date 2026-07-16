'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  isSuspended: boolean;
  profileCompleted: boolean;
};

type Status = 'loading' | 'signed-out' | 'ready';

/**
 * Single source of truth for "who is signed in and are they an admin" on
 * the client. Backed by GET /api/users/me, which itself derives isAdmin
 * from the live ADMIN_EMAILS allow-list (not a value trusted from the
 * client) -- this hook is for UI gating (show/hide the Admin nav link,
 * redirect off /admin) only. The real enforcement is server-side on every
 * /api/admin/* route.
 */
export function useCurrentUser() {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('civiclens_token') : null;
    if (!token) {
      setStatus('signed-out');
      return;
    }
    api
      .getMe()
      .then(({ user: u }) => {
        setUser({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          isAdmin: !!u.isAdmin,
          isSuspended: !!u.is_suspended,
          profileCompleted: !!u.profile_completed,
        });
        setStatus('ready');
      })
      .catch(() => {
        // Token invalid/expired -- treat as signed out rather than looping.
        window.localStorage.removeItem('civiclens_token');
        setStatus('signed-out');
      });
  }, []);

  return { status, user };
}
