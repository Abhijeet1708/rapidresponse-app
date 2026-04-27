'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Bell, BellOff, AlertTriangle, ShieldAlert, LogOut 
} from 'lucide-react';
import dynamic from 'next/dynamic';
import IncidentFeed from '@/components/IncidentFeed';
import IncidentDrawer from '@/components/IncidentDrawer';

const LiveIncidentMap = dynamic(() => import('@/components/LiveIncidentMap'), { ssr: false });

export type Incident = {
  id: string;
  category: string;
  floor_id: string;
  status: string;
  created_at: string;
  pin_coordinates: { x: number, y: number } | null;
  claimed_by: string | null;
  guest_description: string | null;
  voice_note_url: string | null;
  photo_url: string | null;
  floors: { floor_number: number, floor_label: string, floor_map_file_url: string };
  users: { name: string } | null;
};

export type StaffProfile = {
  id: string;
  name: string;
  avatar_url?: string;
  role: string;
};

export default function StaffDashboardClient({ 
  propertyId,
  userProfile
}: { 
  propertyId: string;
  userProfile: { id: string; name: string; role: string; avatar_url?: string };
}) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [onDutyStaff, setOnDutyStaff] = useState<StaffProfile[]>([]);
  const [audioAlertEnabled, setAudioAlertEnabled] = useState(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch of active incidents
    const fetchIncidents = async () => {
      const { data } = await supabase
        .from('incidents')
        .select(`
          *,
          floors (floor_number, floor_label, floor_map_file_url),
          users (name)
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
        
      if (data) setIncidents(data as unknown as Incident[]);
    };

    // Initial fetch of on-duty staff
    const fetchStaff = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, avatar_url, role')
        .eq('property_id', propertyId)
        .eq('is_on_duty', true);
      if (data) setOnDutyStaff(data);
    };

    fetchIncidents();
    fetchStaff();

    // Subscribe to incident changes
    const incidentChannel = supabase
      .channel('staff_incidents')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'incidents',
        filter: `property_id=eq.${propertyId}`
      }, (payload) => {
        fetchIncidents(); // Simplified: refetch on any change to ensure related data is joined
        if (payload.eventType === 'INSERT' && audioAlertEnabled) {
          playAlertSound();
        }
      })
      .subscribe();

    // Subscribe to staff presence
    const staffChannel = supabase
      .channel('staff_presence')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `property_id=eq.${propertyId}`
      }, () => {
        fetchStaff();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(incidentChannel);
      supabase.removeChannel(staffChannel);
    };
  }, [propertyId, audioAlertEnabled]);

  const playAlertSound = () => {
    const audio = new Audio('/alert.mp3'); // We'll need an alert sound in public/
    audio.play().catch(e => console.log('Audio play failed:', e));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const unacknowledgedCount = incidents.filter(i => i.status === 'Reported').length;

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Top Bar */}
      <header className="bg-gray-900 text-white h-16 shrink-0 px-4 flex items-center justify-between z-20 shadow-md">
        <div className="flex items-center space-x-4">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <h1 className="font-bold text-lg">RapidResponse <span className="font-normal text-gray-400">| Command Center</span></h1>
          
          {unacknowledgedCount > 0 && (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {unacknowledgedCount} Unacknowledged
            </div>
          )}
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex -space-x-2">
            {onDutyStaff.map(staff => (
              <div key={staff.id} className="w-8 h-8 rounded-full bg-gray-600 border-2 border-gray-900 flex items-center justify-center text-xs font-bold relative group cursor-pointer">
                {staff.name.charAt(0)}
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-gray-900"></div>
                <div className="absolute hidden group-hover:block top-full mt-2 right-0 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                  {staff.name} ({staff.role})
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setAudioAlertEnabled(!audioAlertEnabled)}
            className={`p-2 rounded-lg transition-colors ${audioAlertEnabled ? 'bg-gray-800 text-green-400' : 'bg-gray-800 text-gray-500'}`}
            title={audioAlertEnabled ? "Mute Alerts" : "Enable Alerts"}
          >
            {audioAlertEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </button>

          <div className="h-6 w-px bg-gray-700"></div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium">{userProfile.name}</p>
              <p className="text-xs text-gray-400">{userProfile.role}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Map */}
        <div className="flex-1 relative bg-gray-200">
          <LiveIncidentMap 
            incidents={incidents} 
            onSelectIncident={setSelectedIncidentId}
            selectedIncidentId={selectedIncidentId}
          />
        </div>

        {/* Right Panel: Feed */}
        <div className="w-96 shrink-0 bg-white border-l border-gray-200 flex flex-col z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.05)]">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Active Incidents</h2>
            <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
              {incidents.filter(i => i.status !== 'Resolved').length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <IncidentFeed 
              incidents={incidents} 
              onSelect={setSelectedIncidentId}
              selectedId={selectedIncidentId}
            />
          </div>
        </div>

        {/* Detail Drawer overlay */}
        <IncidentDrawer 
          incidentId={selectedIncidentId} 
          incidents={incidents} 
          onClose={() => setSelectedIncidentId(null)}
          currentUser={userProfile}
        />
      </div>
    </div>
  );
}
