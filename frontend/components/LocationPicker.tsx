'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, MapPin } from 'lucide-react';
import { api } from '@/lib/api';

// Default center: Bhubaneswar, matching the rest of the starter kit's seed
// data. Swap for your own city, or leave as-is -- the picker re-centers the
// instant a real location is chosen.
const DEFAULT_CENTER: [number, number] = [20.2961, 85.8245];

// A colored SVG pin via divIcon, styled to match the app's own palette,
// instead of Leaflet's default marker image -- which needs extra asset
// wiring (leaflet's default icon paths break under most bundlers/CDN
// setups and silently render as a broken image otherwise).
function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 13.2 25.7 13.8 26.3.6.7 1.7.7 2.3 0C16.8 40.7 30 25.5 30 15 30 6.7 23.3 0 15 0z" fill="${color}"/>
      <circle cx="15" cy="15" r="6" fill="white"/>
    </svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -38],
  });
}

const PICKED_ICON = pinIcon('#2C5FA8'); // blueprint

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom() < 13 ? 15 : map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

export type PickedLocation = { lat: number; lng: number; addressHint: string };

export default function LocationPicker({
  initialLat,
  initialLng,
  onChange,
}: {
  initialLat?: number;
  initialLng?: number;
  onChange: (location: PickedLocation) => void;
}) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [addressHint, setAddressHint] = useState('');
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const resolveAddress = useCallback(async (lat: number, lng: number) => {
    setResolving(true);
    try {
      const place = await api.reverseGeocode(lat, lng);
      const hint = [place.area, place.city].filter(Boolean).join(', ') || place.displayName || '';
      setAddressHint(hint);
      onChange({ lat, lng, addressHint: hint });
    } catch {
      // Reverse geocoding is a convenience, not a requirement -- the pin's
      // coordinates are already enough to submit the report.
      onChange({ lat, lng, addressHint: '' });
    } finally {
      setResolving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePick(lat: number, lng: number) {
    setPosition({ lat, lng });
    setLocateError(null);
    resolveAddress(lat, lng);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocateError('Your browser does not support geolocation. Tap the map to drop a pin instead.');
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        handlePick(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. Tap the map to choose a spot manually instead.'
            : 'Could not get your current location. Tap the map to choose a spot manually.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const center = position || { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-ink">Where is this?</label>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blueprint hover:text-ink disabled:opacity-50"
        >
          <LocateFixed size={14} /> {locating ? 'Locating…' : 'Use current location'}
        </button>
      </div>

      <div className="rounded-md overflow-hidden border border-ink/15 h-64 relative">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={position ? 15 : 12}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPick onPick={handlePick} />
          {position && (
            <>
              <Marker position={[position.lat, position.lng]} icon={PICKED_ICON} />
              <Recenter lat={position.lat} lng={position.lng} />
            </>
          )}
        </MapContainer>
      </div>

      <div className="mt-2 flex items-start gap-1.5 text-xs text-concrete">
        <MapPin size={13} className="mt-0.5 shrink-0" />
        {!position && <span>Tap anywhere on the map to drop a pin, or use your current location.</span>}
        {position && resolving && <span>Looking up the address…</span>}
        {position && !resolving && (
          <span>
            {addressHint || `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`}
          </span>
        )}
      </div>
      {locateError && <p className="mt-1 text-xs text-rejected">{locateError}</p>}
    </div>
  );
}
