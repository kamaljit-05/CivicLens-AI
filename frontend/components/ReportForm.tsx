'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { api } from '@/lib/api';
import AIAssistantPanel from './AIAssistantPanel';

const CATEGORIES = [
  { slug: 'pothole', label: 'Pothole' },
  { slug: 'streetlight', label: 'Streetlight Outage' },
  { slug: 'garbage', label: 'Garbage / Litter' },
  { slug: 'water_leak', label: 'Water Leak' },
  { slug: 'drainage', label: 'Blocked Drainage' },
  { slug: 'sidewalk', label: 'Damaged Sidewalk' },
  { slug: 'graffiti', label: 'Graffiti / Vandalism' },
  { slug: 'traffic_signal', label: 'Traffic Signal Fault' },
  { slug: 'tree', label: 'Fallen / Hazard Tree' },
  { slug: 'other', label: 'Other' },
];

const STEPS = ['Category', 'Details', 'Photo', 'Preview'];

export default function ReportForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [solutionIdea, setSolutionIdea] = useState('');
  const [addressHint, setAddressHint] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function ensureImageUploaded(): Promise<string> {
    if (uploadedImageUrl) return uploadedImageUrl;
    if (!imageFile) throw new Error('Please attach a photo first');
    const { imageUrl } = await api.uploadImage(imageFile);
    setUploadedImageUrl(imageUrl);
    return imageUrl;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const imageUrl = await ensureImageUploaded();
      // Demo coordinates — a real build would pull these from geolocation or a map picker.
      const { issue } = await api.createIssue({
        categorySlug: category,
        title,
        description,
        solutionIdea: solutionIdea || undefined,
        addressHint: addressHint || undefined,
        lat: 20.2961,
        lng: 85.8245,
        imageUrl,
      });
      router.push(`/issues/${issue.id}?submitted=1`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const canAdvance =
    (step === 0 && category) ||
    (step === 1 && title.trim().length >= 3 && description.trim().length >= 10) ||
    (step === 2 && imageFile) ||
    step === 3;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <ol className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2 flex-1">
            <div
              className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                i < step ? 'bg-approved text-white' : i === step ? 'bg-blueprint text-white' : 'bg-ink/10 text-concrete'
              }`}
            >
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:inline ${i === step ? 'text-ink' : 'text-concrete'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-ink/10" />}
          </li>
        ))}
      </ol>

      <div className="rounded-card border border-ink/10 bg-white p-6">
        {step === 0 && (
          <div>
            <h2 className="font-display text-lg font-semibold text-ink mb-4">What kind of problem is this?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setCategory(c.slug)}
                  className={`rounded-md border px-3 py-3 text-sm font-medium text-left transition-colors ${
                    category === c.slug
                      ? 'border-blueprint bg-blueprint/5 text-blueprint'
                      : 'border-ink/10 text-ink hover:border-ink/30'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-ink">Describe the problem</h2>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deep pothole outside Kalinga Stadium gate"
                className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm focus:border-blueprint outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What's happening, and any useful context — how long it's been there, how it affects traffic, etc."
                className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm focus:border-blueprint outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Location hint (optional)</label>
              <input
                value={addressHint}
                onChange={(e) => setAddressHint(e.target.value)}
                placeholder="e.g. Near the bus stop on Jaydev Vihar Road"
                className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm focus:border-blueprint outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">How can this be solved? (optional)</label>
              <input
                value={solutionIdea}
                onChange={(e) => setSolutionIdea(e.target.value)}
                placeholder="e.g. Fill with asphalt and repaint the lane marking"
                className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm focus:border-blueprint outline-none"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-display text-lg font-semibold text-ink mb-4">Attach a photo</h2>
            <label
              htmlFor="issue-photo"
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink/20 rounded-card h-56 cursor-pointer hover:border-blueprint/50 transition-colors overflow-hidden"
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Selected issue" className="h-full w-full object-cover" />
              ) : (
                <>
                  <Camera size={28} className="text-concrete" />
                  <span className="text-sm text-concrete">Tap to take or choose a photo</span>
                </>
              )}
            </label>
            <input id="issue-photo" type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />

            {imageFile && (
              <div className="mt-5">
                <AIAssistantPanel
                  onAnalyze={async () => {
                    // Uploads the photo now so the backend can run the same
                    // multimodal pipeline it uses at submit time, giving the
                    // reporter a live preview before they commit to sending it in.
                    const imageUrl = await ensureImageUploaded();
                    return api.previewAnalysis({ imageUrl, title, description });
                  }}
                />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-display text-lg font-semibold text-ink mb-4">Review and submit</h2>
            <div className="space-y-3 text-sm">
              <Row label="Category" value={CATEGORIES.find((c) => c.slug === category)?.label || '—'} />
              <Row label="Title" value={title} />
              <Row label="Description" value={description} />
              {addressHint && <Row label="Location hint" value={addressHint} />}
              {solutionIdea && <Row label="Suggested fix" value={solutionIdea} />}
              {imagePreview && (
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wide text-blueprint mb-1">Photo</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Issue" className="w-full max-h-56 object-cover rounded-md" />
                </div>
              )}
            </div>
            {submitError && <p className="text-sm text-rejected mt-4">{submitError}</p>}
          </div>
        )}

        {/* Step navigation */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-ink/10">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 text-sm font-medium text-concrete disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance}
              className="inline-flex items-center gap-1 rounded-md bg-blueprint text-white text-sm font-medium px-4 py-2 hover:bg-ink transition-colors disabled:opacity-40"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-1 rounded-md bg-signal text-ink text-sm font-bold px-5 py-2 hover:bg-ink hover:text-white transition-colors disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit report'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-wide text-blueprint mb-0.5">{label}</p>
      <p className="text-ink">{value}</p>
    </div>
  );
}
