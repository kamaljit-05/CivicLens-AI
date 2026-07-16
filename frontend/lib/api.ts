// Thin fetch wrapper around the backend Express API.
//
// IMPORTANT: this calls the backend directly (NEXT_PUBLIC_API_URL) from
// both the server and the browser. An earlier version relied on Next.js
// `rewrites()` to proxy /api/* to the backend, which added a second hop
// through the frontend host's own serverless runtime -- on some static/
// edge hosting setups that hop either 404s (rewrite didn't apply the way
// it does in local `next dev`) or, if the backend is slow to respond
// (e.g. a free-tier host waking from sleep), the proxying function itself
// times out and the browser sees a 504. Calling the backend directly and
// relying on CORS (already configured in backend/src/server.js) removes
// that failure mode entirely.
const BASE = process.env.NEXT_PUBLIC_API_URL;

const REQUEST_TIMEOUT_MS = 15000;

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('civiclens_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

class ApiConfigError extends Error {}

async function request(path: string, options: RequestInit = {}) {
  if (!BASE) {
    // Fail loudly and specifically instead of quietly hitting a relative
    // `/api/...` path that doesn't exist on this Next.js app (there is no
    // app/api directory here -- the API is the separate Express backend).
    throw new ApiConfigError(
      'NEXT_PUBLIC_API_URL is not set for this deployment. The frontend has no way to reach the backend API -- set it in your hosting provider\u2019s environment variables and redeploy.'
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path.startsWith('/api') ? path : `/api${path}`}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        `Request to the CivicLens API timed out after ${REQUEST_TIMEOUT_MS / 1000}s. If this backend is hosted on a free tier (e.g. Render), it may be asleep -- try again in ~30 seconds.`
      );
    }
    throw new Error(
      `Could not reach the CivicLens API at ${BASE}. Check that the backend is running and that FRONTEND_ORIGIN on the backend includes this site's URL (CORS).`
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  signInWithGoogle: (idToken: string) =>
    request('/api/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),

  // Profile
  completeProfile: (profile: {
    username: string;
    occupation?: string;
    city?: string;
    district?: string;
    photoUrl?: string;
  }) => request('/api/users/me/profile', { method: 'PATCH', body: JSON.stringify(profile) }),
  getMe: () => request('/api/users/me'),

  // Geo
  reverseGeocode: (lat: number, lng: number) => request(`/api/geo/reverse?lat=${lat}&lng=${lng}`),

  // Issues
  listIssues: (params: { category?: string; lat?: number; lng?: number; radiusKm?: number } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request(`/api/issues${qs ? `?${qs}` : ''}`);
  },
  getIssue: (id: string) => request(`/api/issues/${id}`),
  createIssue: (issue: {
    categorySlug: string;
    title: string;
    description: string;
    solutionIdea?: string;
    lat: number;
    lng: number;
    addressHint?: string;
    imageUrl: string;
  }) => request('/api/issues', { method: 'POST', body: JSON.stringify(issue) }),
  previewAnalysis: (payload: { imageUrl: string; title: string; description: string }) =>
    request('/api/issues/preview-analysis', { method: 'POST', body: JSON.stringify(payload) }),
  uploadImage: async (file: File) => {
    if (!BASE) throw new ApiConfigError('NEXT_PUBLIC_API_URL is not set for this deployment.');
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${BASE}/api/issues/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Image upload failed: ${res.status}`);
    }
    return res.json();
  },

  // News -- scope is 'area' | 'city' | 'state' | 'country' | 'world'
  getNews: (scope: string, locale?: string) =>
    request(`/api/news?scope=${scope}${locale ? `&locale=${encodeURIComponent(locale)}` : ''}`),

  // Admin
  getAdminStats: () => request('/api/admin/stats'),
  getAdminQueue: () => request('/api/admin/queue'),
  approveIssue: (id: string, notes?: string) =>
    request(`/api/admin/issues/${id}/approve`, { method: 'POST', body: JSON.stringify({ notes }) }),
  rejectIssue: (id: string, notes?: string) =>
    request(`/api/admin/issues/${id}/reject`, { method: 'POST', body: JSON.stringify({ notes }) }),
  resolveDuplicate: (flagId: string, resolution: string, notes?: string) =>
    request(`/api/admin/duplicates/${flagId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution, notes }),
    }),
  getAdminUsers: () => request('/api/admin/users'),
  suspendUser: (id: string) => request(`/api/admin/users/${id}/suspend`, { method: 'POST' }),
  unsuspendUser: (id: string) => request(`/api/admin/users/${id}/unsuspend`, { method: 'POST' }),
};
