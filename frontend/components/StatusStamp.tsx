// The app's signature visual motif: every issue carries an official-looking
// "stamp" that encodes its real review status — a nod to the municipal
// paperwork this app replaces, made instant instead of slow.

const STAMP_STYLES: Record<string, { label: string; color: string; rotate: string }> = {
  pending_review: { label: 'PENDING REVIEW', color: 'border-signal text-signal', rotate: '-rotate-3' },
  approved: { label: 'APPROVED', color: 'border-approved text-approved', rotate: 'rotate-2' },
  rejected: { label: 'REJECTED', color: 'border-rejected text-rejected', rotate: '-rotate-2' },
  potential_duplicate: { label: 'POSSIBLE DUPLICATE', color: 'border-blueprint text-blueprint', rotate: 'rotate-3' },
  resolved: { label: 'RESOLVED', color: 'border-approved text-approved', rotate: 'rotate-1' },
};

export default function StatusStamp({ status }: { status: string }) {
  const style = STAMP_STYLES[status] || STAMP_STYLES.pending_review;
  return (
    <span
      className={`inline-block border-2 ${style.color} ${style.rotate} px-2.5 py-1 font-display text-[11px] font-bold tracking-widest uppercase select-none`}
      style={{ borderRadius: 3 }}
    >
      {style.label}
    </span>
  );
}
