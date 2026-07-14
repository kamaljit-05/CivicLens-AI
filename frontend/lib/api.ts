// Thin fetch wrapper around the backend API. Requests are proxied through
// Next.js rewrites (see next.config.js), so relative /api/* paths work both
// in the browser and during SSR.

const BASE = typeof window === 'undefined' ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000' : '';

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('civiclens_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path.startsWith('/api') ? path : `/api${path}`}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
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

  // News
  getLocalNews: (locale: string, category = 'local') =>
    request(`/api/news?locale=${encodeURIComponent(locale)}&category=${category}`),

  // Admin
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
};
