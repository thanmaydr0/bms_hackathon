import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { useLiveFeed } from '../hooks/useLiveFeed';

// Fix for default Leaflet markers in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

// Helper icons
const sosIcon = L.divIcon({
  className: 'bg-transparent',
  html: '<div class="w-5 h-5 rounded-full bg-cp-magenta animate-ping shadow-[0_0_10px_rgba(255,0,60,0.8)] border-2 border-cp-void"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const getHazardIcon = (severity: string) => {
  let color = 'var(--cp-cyan)';
  let shadow = 'var(--cp-cyan)';
  if (severity === 'critical') {
    color = 'var(--cp-magenta)';
    shadow = 'rgba(255,0,60,0.8)';
  } else if (severity === 'high') {
    color = '#ff9900'; // Orange
    shadow = 'rgba(255,153,0,0.8)';
  } else if (severity === 'medium') {
    color = 'var(--cp-yellow)';
    shadow = 'rgba(252,238,10,0.8)';
  } else if (severity === 'low') {
    color = 'var(--cp-green)';
    shadow = 'rgba(0,255,159,0.8)';
  }

  return L.divIcon({
    className: 'bg-transparent',
    html: `<div style="background-color: ${color}; box-shadow: 0 0 8px ${shadow};" class="w-4 h-4 rounded-full border-2 border-cp-void"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const CATEGORIES: Record<string, string> = {
  collapsed_building: '🏚',
  blocked_road: '🚧',
  fire: '🔥',
  flood: '🌊',
  medical: '🏥',
  resource: '📦',
  other: '⚠️',
};

function LocationTracker() {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    let firstFix = true;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newPos: [number, number] = [latitude, longitude];
        setPosition(newPos);
        if (firstFix) {
          map.setView(newPos, 15);
          firstFix = false;
        }
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map]);

  if (!position) return null;

  return (
    <CircleMarker 
      center={position} 
      radius={8} 
      pathOptions={{ color: 'var(--cp-cyan)', fillColor: 'var(--cp-cyan)', fillOpacity: 0.4 }}
    >
      <Popup className="cyber-popup">
        <div className="font-mono text-xs font-bold text-cp-base">YOU ARE HERE</div>
      </Popup>
    </CircleMarker>
  );
}

export default function MapView() {
  const { feed } = useLiveFeed();

  // Filter out items that don't have coordinates
  const markers = feed.filter(item => {
    if (item.type === 'hazard') return item.latitude !== undefined && item.longitude !== undefined;
    if (item.type === 'message') return item.latitude !== undefined && item.longitude !== undefined;
    return false;
  });

  return (
    <div className="flex flex-col h-full relative">
      {/* Map overlay header */}
      <div className="absolute top-0 left-0 right-0 z-[400] pointer-events-none p-3">
        <div className="bg-cp-panel/90 border-2 border-cp-cyan shadow-[0_4px_16px_rgba(0,240,255,0.2)] p-2 flex items-center justify-between clip-angled backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cp-magenta animate-pulse" />
            <span className="font-cyber font-bold text-[10px] tracking-[0.2em] text-cp-cyan">GEO_INTEL</span>
          </div>
          <span className="font-mono text-[9px] text-cp-text tracking-widest bg-cp-magenta/20 px-1 border border-cp-magenta/50">
            RADAR_ON
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative z-0">
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={13}
          style={{ height: '100%', width: '100%', background: '#050505' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          <LocationTracker />

          {markers.map((item) => {
            if (item.type === 'hazard') {
              const icon = CATEGORIES[item.category] || '⚠️';
              const date = new Date(item.timestamp).toLocaleTimeString();
              return (
                <Marker 
                  key={`haz-${item.id}`} 
                  position={[item.latitude, item.longitude]}
                  icon={getHazardIcon(item.severity)}
                >
                  <Popup className="cyber-popup">
                    <div className="p-1 min-w-[150px]">
                      <div className="flex items-center gap-2 mb-2 border-b border-black/10 pb-1">
                        <span className="text-xl">{icon}</span>
                        <span className="font-mono text-[10px] font-bold uppercase py-0.5 px-1 bg-black/5 rounded">
                          {item.severity}
                        </span>
                      </div>
                      <p className="font-sans text-sm mb-2">{item.description}</p>
                      <p className="font-mono text-[9px] text-gray-500 text-right">{date}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            }

            if (item.type === 'message' && item.priority === 'SOS') {
              const date = new Date(item.timestamp).toLocaleTimeString();
              return (
                <Marker 
                  key={`msg-${item.id}`} 
                  position={[item.latitude as number, item.longitude as number]}
                  icon={sosIcon}
                >
                  <Popup className="cyber-popup">
                    <div className="p-1 min-w-[150px]">
                      <div className="flex items-center gap-2 mb-2 border-b border-red-500/20 pb-1">
                        <span className="font-mono text-[10px] font-bold text-red-600 animate-pulse tracking-widest">
                          SOS BEACON
                        </span>
                      </div>
                      <p className="font-sans text-sm mb-2 font-bold">{item.content}</p>
                      <p className="font-mono text-[9px] text-gray-500 text-right">{date}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            }

            return null;
          })}
        </MapContainer>

        {/* Subtle grid over map to maintain cyberpunk feel */}
        <div className="absolute inset-0 z-[400] bg-cyber-grid bg-grid-sm opacity-10 pointer-events-none mix-blend-screen" />
        <div className="absolute inset-0 z-[400] p-1 bg-gradient-to-b from-cp-cyan via-transparent to-cp-magenta opacity-30 pointer-events-none" />
      </div>
    </div>
  );
}
