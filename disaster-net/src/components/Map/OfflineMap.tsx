import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { db, type DisasterReport } from '../../lib/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { getCurrentPositionSafe } from '../../lib/geolocation';

// Fix Leaflet's default icon missing issue in simple React setups
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to handle geolocation and follow user
const LocationTracker = ({ userLocation }: { userLocation: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (userLocation) {
      map.flyTo(userLocation, 14);
    }
  }, [userLocation, map]);
  return null;
};

export const OfflineMap: React.FC = () => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  
  // Real-time Dexie subscription for offline disaster reports
  const reports = useLiveQuery(() => db.reports.toArray(), []);

  useEffect(() => {
    getCurrentPositionSafe().then((pos) => {
      if (pos) {
        setUserLocation([pos.latitude, pos.longitude]);
      }
    });
  }, []);

  const defaultPosition: [number, number] = [0, 0];

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={userLocation || defaultPosition} 
        zoom={13} 
        className="w-full h-full rounded-2xl shadow-inner border border-slate-200"
        zoomControl={false}
      >
        <LocationTracker userLocation={userLocation} />
        
        {/* Offline Cacheable Map Tiles via sw.js configuration */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {/* Disaster Reports */}
        {reports?.map((report: DisasterReport) => (
          <Marker key={report.id} position={[report.latitude, report.longitude]}>
            <Popup>
              <div className="font-sans">
                <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase mb-2 ${
                  report.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                  report.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {report.type}
                </span>
                <p className="font-semibold text-slate-800">{report.description}</p>
                <p className="text-xs text-slate-400 mt-2">{new Date(report.timestamp).toLocaleString()}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
