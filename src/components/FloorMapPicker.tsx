'use client';

import { useState } from 'react';
import { MapContainer, ImageOverlay, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface FloorMapPickerProps {
  floorMapUrl: string;
  onLocationSelect: (coords: { x: number, y: number }) => void;
}

function LocationMarker({ onSelect }: { onSelect: (coords: { x: number, y: number }) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onSelect({ x: e.latlng.lng, y: e.latlng.lat });
    },
  });

  if (!position) return null;

  const icon = L.divIcon({
    className: 'bg-transparent',
    html: `<div class="w-6 h-6 bg-red-600 rounded-full border-4 border-white shadow-lg -translate-x-1/2 -translate-y-1/2"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return <Marker position={position} icon={icon} />;
}

export default function FloorMapPicker({ floorMapUrl, onLocationSelect }: FloorMapPickerProps) {
  // Use a coordinate system from [0, 0] to [1000, 1000] for simplicity
  const bounds: L.LatLngBoundsExpression = [[0, 0], [1000, 1000]];

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-sm border border-gray-200">
      <MapContainer
        center={[500, 500]}
        zoom={-1}
        minZoom={-2}
        maxZoom={2}
        crs={L.CRS.Simple}
        style={{ height: '100%', width: '100%', background: '#f8fafc' }}
        maxBounds={bounds}
      >
        <ImageOverlay url={floorMapUrl} bounds={bounds} />
        <LocationMarker onSelect={onLocationSelect} />
      </MapContainer>
    </div>
  );
}
