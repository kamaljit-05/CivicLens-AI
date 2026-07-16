'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LocateFixed } from 'lucide-react';
import { api } from '@/lib/api';

/**
 * Progressive-profiling step 2. Google Sign-In already supplied name + email;
 * this short screen collects the rest (username, occupation, city/district,
 * photo) — and can be skipped, since the app never forces it to keep using
 * the core report/browse flow.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [occupation, setOccupation] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Your browser does not support geolocation — enter your city manually.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const place = await api.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (place.city) setCity(place.city);
          if (place.state) setDistrict((prev) => prev || place.state);
        } catch {
          setError('Could not resolve your location to a city — enter it manually.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setError('Location access was denied — enter your city manually.');
      },
      { timeout: 10000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.completeProfile({ username, occupation, city, district });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-blueprint mb-3">Almost there</p>
      <h1 className="font-display text-2xl font-bold text-ink mb-2">Finish setting up your profile</h1>
      <p className="text-concrete text-sm mb-8">
        Takes about 30 seconds. You can skip this and fill it in later from your profile menu.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Username" value={username} onChange={setUsername} placeholder="e.g. rakesh_bbsr" required />
        <Field label="Occupation" value={occupation} onChange={setOccupation} placeholder="e.g. Teacher" />
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-ink">Location</span>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blueprint hover:text-ink disabled:opacity-50"
            >
              <LocateFixed size={13} /> {locating ? 'Locating…' : 'Use current location'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" value={city} onChange={setCity} placeholder="Bhubaneswar" />
            <Field label="District" value={district} onChange={setDistrict} placeholder="Khordha" />
          </div>
        </div>

        {error && <p className="text-sm text-rejected">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || username.trim().length < 3}
            className="rounded-md bg-blueprint text-white text-sm font-medium px-5 py-2.5 hover:bg-ink transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save and continue'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm font-medium text-concrete hover:text-ink"
          >
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1">
        {label} {required && <span className="text-blueprint">*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm focus:border-blueprint outline-none"
      />
    </div>
  );
}
