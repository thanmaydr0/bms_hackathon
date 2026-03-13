import { useEffect, useState, useContext, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { useLiveFeed } from '../hooks/useLiveFeed';
import { preloadLocalTiles } from '../lib/tileCachePreloader';
import { ToastContext } from '../components/ToastProvider';
import { HazardReportForm } from '../components/HazardReportForm';
import { cn } from '../lib/utils';
import { getCurrentPositionSafe } from '../lib/geolocation';

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
    if (!navigator.geolocation) return;
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
      (err) => console.warn('[LocationTracker] Geolocation error:', err.message),
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

function MapControls() {
  const map = useMap();
  const toast = useContext(ToastContext);
  const [cacheState, setCacheState] = useState<'idle' | 'caching' | 'cached'>('idle');
  const [progress, setProgress] = useState(0);
  const [totalTiles, setTotalTiles] = useState(0);

  useEffect(() => {
    if (localStorage.getItem('map_cached') === 'true') {
      setCacheState('cached');
    }
  }, []);

  const handleCache = async () => {
    if (cacheState === 'caching' || cacheState === 'cached') return;

    setCacheState('caching');
    const center = map.getCenter();
    
    // Quick polling simulation for progress UI (actual fetch is opaque to progress tracking during Promise.all)
    let simProgress = 0;
    const estTotal = 400; // rough estimate
    setTotalTiles(estTotal);
    
    const simInterval = setInterval(() => {
      simProgress += Math.floor(Math.random() * 5);
      setProgress(Math.min(simProgress, estTotal - 1));
    }, 100);

    try {
      const { total } = await preloadLocalTiles(center.lat, center.lng);
      clearInterval(simInterval);
      setProgress(total);
      setTotalTiles(total);
      setCacheState('cached');
      localStorage.setItem('map_cached', 'true');
      toast?.showToast('Map tiles cached for offline use', 'success');
    } catch (err) {
      clearInterval(simInterval);
      setCacheState('idle');
      toast?.showToast('Failed to cache map area', 'error');
    }
  };

  return (
    <div className="absolute top-16 right-3 z-[400] pointer-events-auto">
      <button
        onClick={handleCache}
        disabled={cacheState === 'caching' || cacheState === 'cached'}
        className={`flex items-center gap-2 px-3 py-2 font-cyber font-bold text-[10px] tracking-widest clip-angled shadow-md transition-all ${
          cacheState === 'cached'
            ? 'bg-cp-green/20 border-2 border-cp-green text-cp-green shadow-neon-green/50 opacity-80 cursor-default'
            : cacheState === 'caching'
            ? 'bg-cp-yellow/20 border-2 border-cp-yellow text-cp-yellow cursor-wait'
            : 'bg-cp-void border-2 border-cp-cyan text-cp-cyan hover:bg-cp-cyan hover:text-cp-void active:translate-y-1'
        }`}
      >
        {cacheState === 'cached' ? (
          <>
            <span>✅</span> MAP CACHED
          </>
        ) : cacheState === 'caching' ? (
          <>
            <span className="w-3 h-3 border-2 border-cp-yellow border-t-transparent rounded-full animate-spin" />
            <span className="animate-pulse">CACHING... {progress}/{totalTiles}</span>
          </>
        ) : (
          <>
            <span>📥</span> CACHE AREA
          </>
        )}
      </button>
    </div>
  );
}

function MapRecenter() {
  const map = useMap();
  const toast = useContext(ToastContext);

  const handleRecenter = async () => {
    const pos = await getCurrentPositionSafe();
    if (pos) {
      map.setView([pos.latitude, pos.longitude], 15);
    } else {
      toast?.showToast('GPS location not available', 'error');
    }
  };

  return (
    <div className="absolute top-16 left-3 z-[400] pointer-events-auto">
      <button
        onClick={handleRecenter}
        className="w-10 h-10 flex items-center justify-center bg-cp-void/90 border-2 border-cp-cyan text-cp-cyan shadow-md hover:bg-cp-cyan hover:text-cp-void active:translate-y-1 transition-none clip-angled backdrop-blur-sm"
        title="Recenter Map"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          <circle cx="12" cy="12" r="6" strokeWidth={2} />
        </svg>
      </button>
    </div>
  );
}

function MapLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-28 right-3 z-[400] pointer-events-auto flex flex-col items-end">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 bg-cp-void/90 border-2 border-cp-border text-cp-dim font-mono text-[9px] font-bold tracking-widest hover:border-cp-cyan hover:text-cp-cyan transition-none backdrop-blur-sm shadow-md flex items-center gap-1"
      >
        <span>LEGEND</span>
        <span className="text-[7px]">{isOpen ? '▼' : '◀'}</span>
      </button>

      {isOpen && (
        <div className="mt-2 p-3 bg-cp-void/90 border-2 border-cp-border backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.8)] clip-angled flex flex-col gap-2 w-40">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cp-magenta shadow-[0_0_8px_var(--cp-magenta)] border border-cp-base" />
            <span className="font-mono text-[9px] text-cp-text uppercase">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff9900] shadow-[0_0_8px_#ff9900] border border-cp-base" />
            <span className="font-mono text-[9px] text-cp-text uppercase">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cp-yellow shadow-[0_0_8px_var(--cp-yellow)] border border-cp-base" />
            <span className="font-mono text-[9px] text-cp-text uppercase">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cp-green shadow-[0_0_8px_var(--cp-green)] border border-cp-base" />
            <span className="font-mono text-[9px] text-cp-text uppercase">Low</span>
          </div>
          <div className="w-full h-px bg-cp-border my-1" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cp-magenta animate-pulse border border-cp-base flex items-center justify-center text-[6px] text-cp-void font-bold shadow-hard-magenta">!</div>
            <span className="font-mono text-[9px] text-cp-text uppercase">SOS Beacon</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cp-cyan mix-blend-screen opacity-80" />
            <span className="font-mono text-[9px] text-cp-text uppercase">Your Loc</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MapAddFab({ openForm }: { openForm: (coords: {lat: number, lng: number}) => void }) {
  const map = useMap();

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[400] pointer-events-auto">
      <button
        onClick={() => {
          const center = map.getCenter();
          openForm({ lat: center.lat, lng: center.lng });
        }}
        className="w-14 h-14 bg-cp-magenta border-2 border-cp-void shadow-hard-magenta text-cp-void text-2xl font-black flex items-center justify-center hover:scale-110 active:scale-95 transition-transform clip-angled"
        title="Add Hazard Here"
      >
        +
      </button>
    </div>
  );
}

export default function MapView() {
  const { feed } = useLiveFeed();

  // Filter States
  const [showHazards, setShowHazards] = useState(true);
  const [showSOSOnly, setShowSOSOnly] = useState(false);
  const [criticalOnly, setCriticalOnly] = useState(false);

  // Form State
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);
  const [initialCoords, setInitialCoords] = useState<{lat: number; lng: number} | undefined>();

  // UseMemo to filter the feed efficiently
  const markers = useMemo(() => {
    return feed.filter(item => {
      // Must have coordinates
      if (item.latitude === undefined || item.longitude === undefined) return false;

      if (item.type === 'message') {
        // If "SOS Only" is enabled, drop non-SOS messages. 
        // If "Critical Only" is enabled, only SOS messages pass anyway since info/warning aren't critical.
        if (showSOSOnly || criticalOnly) {
          return item.priority === 'sos';
        }
        return true;
      }

      if (item.type === 'hazard') {
        if (!showHazards) return false;
        if (showSOSOnly) return false; // Hide hazards if SOS ONLY is selected
        if (criticalOnly) return item.severity === 'critical';
        return true;
      }

      return false;
    });
  }, [feed, showHazards, showSOSOnly, criticalOnly]);

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
          style={{ height: '100%', width: '100%', background: '#050505', overscrollBehavior: 'none', touchAction: 'none' }}
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
                  <Popup className="cyber-popup border border-cp-border bg-cp-base">
                    <div className="p-1 min-w-[150px]">
                      <div className="flex items-center gap-2 mb-2 border-b-2 border-cp-border pb-1">
                        <span className="text-xl">{icon}</span>
                        <span className="font-mono text-[10px] font-bold uppercase py-0.5 px-1 bg-cp-panel text-cp-text rounded-none border border-cp-border">
                          {item.severity}
                        </span>
                      </div>
                      <p className="font-mono text-sm mb-2 text-cp-text">{item.description}</p>
                      <p className="font-mono text-[9px] text-cp-dim text-right">{date}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            }

            if (item.type === 'message' && item.priority === 'sos') {
              const date = new Date(item.timestamp).toLocaleTimeString();
              return (
                <Marker 
                  key={`msg-${item.id}`} 
                  position={[item.latitude as number, item.longitude as number]}
                  icon={sosIcon}
                >
                  <Popup className="cyber-popup border-2 border-cp-magenta bg-cp-void shadow-hard-magenta">
                    <div className="p-1 min-w-[150px]">
                      <div className="flex items-center gap-2 mb-2 border-b border-cp-magenta/40 pb-1">
                        <span className="font-mono text-[10px] font-bold text-cp-magenta animate-pulse tracking-widest">
                          SOS BEACON
                        </span>
                      </div>
                      <p className="font-mono text-sm mb-2 font-bold text-cp-text">{item.text}</p>
                      <p className="font-mono text-[9px] text-cp-dim text-right">{date}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            }

            return null;
          })}

        {/* Global UI Overlays container (above map) */}
        {/* Top-Right Stack: Cache & Legend */}
        <div className="absolute top-16 right-3 z-[400] flex flex-col items-end gap-2 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <MapControls />
            <MapLegend />
          </div>
        </div>

        {/* Top-Left Stack: Recenter */}
        <div className="absolute top-16 left-3 z-[400] flex flex-col items-start gap-2 pointer-events-none">
          <div className="pointer-events-auto">
            <MapRecenter />
          </div>
        </div>

        {/* Bottom Elements: Filters and FAB */}
        <div className="absolute bottom-24 left-3 right-3 z-[400] flex justify-between items-end pointer-events-none pb-safe">
          {/* Bottom Left Filter Panel */}
          <div className="pointer-events-auto">
            <div className="bg-cp-panel/90 border-2 border-cp-border p-3 clip-angled backdrop-blur-sm shadow-md flex flex-col gap-2 min-w-[140px]">
              <span className="font-cyber text-[8px] text-cp-dim tracking-widest border-b border-cp-border pb-1 mb-1">
                FILTERS
              </span>
              
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={showHazards} 
                  onChange={(e) => setShowHazards(e.target.checked)}
                  className="hidden"
                />
                <div className={cn("w-3 h-3 border", showHazards ? "bg-cp-cyan border-cp-cyan" : "bg-cp-void border-cp-dim group-hover:border-cp-cyan")} />
                <span className={cn("font-mono text-[9px] uppercase", showHazards ? "text-cp-cyan font-bold" : "text-cp-dim")}>
                  Show Hazards
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={showSOSOnly} 
                  onChange={(e) => setShowSOSOnly(e.target.checked)}
                  className="hidden"
                />
                <div className={cn("w-3 h-3 border", showSOSOnly ? "bg-cp-magenta border-cp-magenta animate-pulse" : "bg-cp-void border-cp-dim group-hover:border-cp-magenta")} />
                <span className={cn("font-mono text-[9px] uppercase", showSOSOnly ? "text-cp-magenta font-bold" : "text-cp-dim")}>
                  SOS Only
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={criticalOnly} 
                  onChange={(e) => setCriticalOnly(e.target.checked)}
                  className="hidden"
                />
                <div className={cn("w-3 h-3 border", criticalOnly ? "bg-cp-yellow border-cp-yellow" : "bg-cp-void border-cp-dim group-hover:border-cp-yellow")} />
                <span className={cn("font-mono text-[9px] uppercase", criticalOnly ? "text-cp-yellow font-bold" : "text-cp-dim")}>
                  Critical Only
                </span>
              </label>
            </div>
          </div>

          {/* Bottom Center FAB (shifted to align) */}
          <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-0">
            <MapAddFab openForm={(c) => { setInitialCoords(c); setIsReportFormOpen(true); }} />
          </div>
        </div>
        </MapContainer>

        {/* Subtle grid over map to maintain cyberpunk feel */}
        <div className="absolute inset-0 z-[399] bg-cyber-grid bg-grid-sm opacity-10 pointer-events-none mix-blend-screen" />
        <div className="absolute inset-0 z-[399] p-1 bg-gradient-to-b from-cp-cyan via-transparent to-cp-magenta opacity-10 pointer-events-none" />
      </div>

      {isReportFormOpen && (
        <HazardReportForm
          initialCoords={initialCoords}
          onClose={() => {
            setIsReportFormOpen(false);
            setInitialCoords(undefined);
          }}
          onSuccess={() => setIsReportFormOpen(false)}
        />
      )}
    </div>
  );
}
