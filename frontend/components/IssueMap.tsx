'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import StatusStamp from './StatusStamp';

const DEFAULT_CENTER: [number, number] = [20.2961, 85.8245];

const STATUS_COLORS: Record<string, string> = {
  pending_review: '#E8A33D', // signal
  potential_duplicate: '#E8A33D',
  approved: '#2C5FA8', // blueprint
  resolved: '#2F7D5C', // approved (green)
  rejected: '#C1432E',
};

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<svg width="26" height="36" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 13.2 25.7 13.8 26.3.6.7 1.7.7 2.3 0C16.8 40.7 30 25.5 30 15 30 6.7 23.3 0 15 0z" fill="${color}"/>
      <circle cx="15" cy="15" r="6" fill="white"/>
    </svg>`,
    iconSize: [26, 36],
    iconAnchor: [13, 36],
    popupAnchor: [0, -32],
  });
}

const ICONS = Object.fromEntries(
  Object.entries(STATUS_COLORS).map(([status, color]) => [status, pinIcon(color)])
);
const DEFAULT_ICON = pinIcon('#6B7280');

export type MapIssue = {
  id: string;
  title: string;
  status: string;
  category_label?: string;
  lat: number;
  lng: number;
};

export default function IssueMap({
  issues,
  center,
}: {
  issues: MapIssue[];
  center?: { lat: number; lng: number };
}) {
  const mapCenter = center ? [center.lat, center.lng] : DEFAULT_CENTER;

  return (
    <div className="rounded-card overflow-hidden border border-ink/10 h-[520px]">
      <MapContainer center={mapCenter as [number, number]} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {issues.map((issue) => (
          <Marker
            key={issue.id}
            position={[issue.lat, issue.lng]}
            icon={ICONS[issue.status] || DEFAULT_ICON}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-mono text-[10px] uppercase tracking-wide text-blueprint mb-1">
                  {issue.category_label || 'Issue'}
                </p>
                <p className="font-semibold text-sm text-ink mb-1.5">{issue.title}</p>
                <div className="mb-2">
                  <StatusStamp status={issue.status} />
                </div>
                <Link href={`/issues/${issue.id}`} className="text-xs font-medium text-blueprint hover:underline">
                  View details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {issues.length === 0 && (
        <p className="sr-only">No issues to display on the map yet.</p>
      )}
    </div>
  );
}
