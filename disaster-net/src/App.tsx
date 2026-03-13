import React, { useState } from 'react';
import { db } from './lib/db/db';
import { OfflineMap } from './components/Map/OfflineMap';
import { SyncDialog } from './components/SyncDialog';
import { useLiveQuery } from 'dexie-react-hooks';

export default function App() {
  const [showSync, setShowSync] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Basic form state
  const [type, setType] = useState<'medical' | 'fire' | 'supplies' | 'structure' | 'other'>('other');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  const reportCount = useLiveQuery(() => db.reports.count(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    let coords: [number, number] = [0, 0];
    try {
      if ('geolocation' in navigator) {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true })
        );
        coords = [pos.coords.latitude, pos.coords.longitude];
      }
    } catch (err: unknown) {
      console.warn('Could not get precise location for report, using default.', err);
    }

    await db.reports.put({
      id: crypto.randomUUID(),
      type,
      description,
      urgency,
      status: 'active',
      timestamp: Date.now(),
      latitude: coords[0],
      longitude: coords[1],
      authorId: 'local-device', // In a real app, this would be a persistent UUID per install
    });

    setShowForm(false);
    setDescription('');
  };

  return (
    <div className="flex justify-center w-full h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="w-full max-w-md h-full bg-white shadow-xl flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <header className="px-6 py-4 bg-red-600 text-white shadow-md z-10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">DisasterNet</h1>
            <p className="text-xs text-red-200 uppercase tracking-wider font-semibold">Offline Verified</p>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col items-end">
               <span className="text-xs font-medium text-red-200">Reports</span>
               <span className="text-sm font-bold">{reportCount ?? 0}</span>
            </div>
            <button 
              onClick={() => setShowSync(true)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur transition-colors p-2 rounded-lg ml-2"
              title="Sync with nearby peer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
            </button>
          </div>
        </header>

        {/* Map Area */}
        <main className="flex-1 relative bg-slate-200">
           <OfflineMap />
        </main>

        {/* Action Button */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6 z-10 pointer-events-none">
           <button 
             onClick={() => setShowForm(true)}
             className="pointer-events-auto bg-slate-900 text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-transform flex items-center gap-2"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
             Create Report
           </button>
        </div>

        {/* Sync Dialog */}
        {showSync && <SyncDialog />}

        {/* Report Form Offcanvas */}
        {showForm && (
          <div className="absolute inset-0 z-40 bg-white flex flex-col animate-in slide-in-from-bottom-full duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold">New Report</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Issue Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['medical', 'fire', 'supplies', 'structure', 'other'] as const).map(t => (
                    <button 
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-3 px-4 rounded-xl border font-medium text-sm capitalize transition-colors ${type === t ? 'border-red-600 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Urgency</label>
                <select 
                  value={urgency} 
                  onChange={e => setUrgency(e.target.value as 'low' | 'medium' | 'high' | 'critical')}
                  className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl font-medium focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all"
                >
                  <option value="low">Low - Monitor</option>
                  <option value="medium">Medium - Needs Attention</option>
                  <option value="high">High - Urgent</option>
                  <option value="critical">Critical - Life Threatening</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea 
                  required
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the situation, required resources, or hazards..."
                  className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl font-medium focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all resize-none"
                />
              </div>

              <div className="mt-auto pt-6">
                <button type="submit" className="w-full bg-red-600 text-white font-bold py-4 rounded-xl shadow-md active:bg-red-700 transition-colors">
                  Submit Report (Saves Offline)
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
