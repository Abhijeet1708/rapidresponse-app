'use client';

import { useEffect } from 'react';
import { MapContainer, ImageOverlay, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Incident } from '@/app/staff/StaffDashboardClient';

function MapController({ incidents, selectedId }: { incidents: Incident[], selectedId: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedId) {
      const selected = incidents.find(i => i.id === selectedId);
      if (selected && selected.pin_coordinates) {
        map.flyTo([selected.pin_coordinates.y, selected.pin_coordinates.x], 1, {
          duration: 1.5
        });
      }
    }
  }, [selectedId, incidents, map]);

  return null;
}

export default function LiveIncidentMap({ 
  incidents, 
  onSelectIncident,
  selectedIncidentId 
}: { 
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
  selectedIncidentId: string | null;
}) {
  const bounds: L.LatLngBoundsExpression = [[0, 0], [1000, 1000]];
  
  // Get active floor map (using the first incident's floor map for now, or a default)
  // In a real app with multi-floor, we'd need a floor selector toggle
  const activeFloorMapUrl = incidents.length > 0 
    ? incidents[0].floors.floor_map_file_url 
    : 'https://via.placeholder.com/1000x1000.png?text=Floor+Map+Not+Available';

  const getMarkerIcon = (status: string, isSelected: boolean) => {
    let colorClass = 'bg-gray-500';
    let pulseClass = '';

    switch(status) {
      case 'Reported': 
        colorClass = 'bg-amber-500';
        pulseClass = 'animate-pulse';
        break;
      case 'Escalated':
      case 'Critical':
        colorClass = 'bg-red-600';
        pulseClass = 'animate-ping';
        break;
      case 'Acknowledged':
      case 'Responding':
        colorClass = 'bg-blue-500';
        break;
      case 'Resolved':
        colorClass = 'bg-green-500';
        break;
    }

    const sizeClass = isSelected ? 'w-8 h-8' : 'w-6 h-6';
    const borderClass = isSelected ? 'border-4 border-black shadow-2xl' : 'border-2 border-white shadow-lg';

    return L.divIcon({
      className: 'bg-transparent',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="${pulseClass} absolute inset-0 rounded-full ${colorClass} opacity-40 scale-150"></div>
          <div class="${sizeClass} ${colorClass} rounded-full ${borderClass} relative z-10 transition-all duration-300"></div>
        </div>
      `,
      iconSize: isSelected ? [32, 32] : [24, 24],
      iconAnchor: isSelected ? [16, 16] : [12, 12]
    });
  };

  return (
    <div className="h-full w-full">
      <MapContainer
        center={[500, 500]}
        zoom={-1}
        minZoom={-2}
        maxZoom={2}
        crs={L.CRS.Simple}
        style={{ height: '100%', width: '100%', background: '#e2e8f0' }}
        maxBounds={bounds}
      >
        <ImageOverlay url={activeFloorMapUrl} bounds={bounds} opacity={0.9} />
        <MapController incidents={incidents} selectedId={selectedIncidentId} />
        
        {incidents.filter(i => i.pin_coordinates).map(incident => (
          <Marker 
            key={incident.id}
            position={[incident.pin_coordinates!.y, incident.pin_coordinates!.x]}
            icon={getMarkerIcon(incident.status, incident.id === selectedIncidentId)}
            eventHandlers={{
              click: () => onSelectIncident(incident.id)
            }}
          >
            <Popup className="rounded-xl overflow-hidden shadow-xl border-0">
              <div className="p-3 bg-white min-w-[200px]">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    incident.status === 'Reported' ? 'bg-amber-500' :
                    incident.status === 'Escalated' ? 'bg-red-500' :
                    incident.status === 'Resolved' ? 'bg-green-500' :
                    'bg-blue-500'
                  }`} />
                  <h3 className="font-bold text-gray-900">{incident.category}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-1">Floor {incident.floors.floor_number}</p>
                <p className="text-xs font-mono text-gray-400">{incident.status}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
