'use client';

import { Incident, StaffProfile } from '@/app/staff/StaffDashboardClient';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { 
  X, MapPin, Clock, Mic, Image as ImageIcon,
  UserCheck, ShieldAlert, CheckCircle, UserPlus
} from 'lucide-react';
import { useState } from 'react';

export default function IncidentDrawer({ 
  incidentId, 
  incidents, 
  onClose,
  currentUser,
  onDutyStaff
}: { 
  incidentId: string | null;
  incidents: Incident[];
  onClose: () => void;
  currentUser: StaffProfile;
  onDutyStaff: StaffProfile[];
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const incident = incidents.find(i => i.id === incidentId);

  if (!incident) return null;

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    
    const updates: any = { status: newStatus };
    
    // Also claim if acknowledging
    if (newStatus === 'Acknowledged' && !incident.claimed_by) {
      updates.claimed_by = currentUser.id;
    }
    
    // Time stamps
    if (newStatus === 'Acknowledged') updates.acknowledged_at = new Date().toISOString();
    if (newStatus === 'Responding') updates.responded_at = new Date().toISOString();
    if (newStatus === 'Resolved') updates.resolved_at = new Date().toISOString();

    await supabase
      .from('incidents')
      .update(updates)
      .eq('id', incident.id);
      
    setIsUpdating(false);
  };

  const claimIncident = async () => {
    setIsUpdating(true);
    await supabase
      .from('incidents')
      .update({ claimed_by: currentUser.id })
      .eq('id', incident.id);
    setIsUpdating(false);
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 flex flex-col ${incidentId ? 'translate-x-0' : 'translate-x-full'}`}>
      
      {/* Header */}
      <div className="bg-gray-900 text-white p-5 flex items-start justify-between shrink-0">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="bg-gray-800 px-2 py-0.5 rounded text-xs font-mono text-gray-400">
              #{incident.id.split('-')[0].toUpperCase()}
            </span>
            <span className="text-xs text-gray-400 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
            </span>
          </div>
          <h2 className="text-xl font-bold flex items-center">
            {incident.status === 'Reported' && <div className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2 animate-pulse"></div>}
            {incident.category}
          </h2>
        </div>
        <button onClick={onClose} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Status Actions */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Response Actions</h3>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            {incident.status === 'Reported' && (
              <button 
                onClick={() => updateStatus('Acknowledged')}
                disabled={isUpdating}
                className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center"
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Acknowledge Incident
              </button>
            )}
            
            {(incident.status === 'Acknowledged' || incident.status === 'Reported') && (
              <button 
                onClick={() => updateStatus('Responding')}
                disabled={isUpdating}
                className="col-span-2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Mark as Responding
              </button>
            )}

            {['Acknowledged', 'Responding', 'Escalated'].includes(incident.status) && (
              <button 
                onClick={() => updateStatus('Resolved')}
                disabled={isUpdating}
                className="col-span-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Resolve Incident
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">Assigned to:</span>
              {incident.claimed_by ? (
                <span className="font-bold text-gray-900 bg-gray-200 px-2 py-0.5 rounded text-sm">
                  {incident.users?.name || 'Unknown'}
                </span>
              ) : (
                <span className="text-sm text-amber-600 font-medium">Unassigned</span>
              )}
            </div>
            
            {!incident.claimed_by && (
              <button onClick={claimIncident} disabled={isUpdating} className="text-sm font-bold text-blue-600 hover:text-blue-800">
                Claim
              </button>
            )}
            {incident.claimed_by && incident.claimed_by !== currentUser.id && (
              <button onClick={claimIncident} disabled={isUpdating} className="text-sm font-bold text-gray-500 hover:text-gray-800">
                Take Over
              </button>
            )}
          </div>
        </div>

        {/* Location & Details */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Incident Details</h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-start">
              <MapPin className="w-5 h-5 text-red-500 mr-3 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Floor {incident.floors.floor_number}</p>
                <p className="text-sm text-gray-600">{incident.floors.floor_label}</p>
                {incident.pin_coordinates && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>
                    Pin placed on map
                  </p>
                )}
              </div>
            </div>
            
            {incident.guest_description && (
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Guest Description:</p>
                <p className="text-sm text-gray-800 italic">"{incident.guest_description}"</p>
              </div>
            )}

            {(incident.photo_url || incident.voice_note_url) && (
              <div className="p-4 grid grid-cols-2 gap-4">
                {incident.photo_url && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2 flex items-center">
                      <ImageIcon className="w-3 h-3 mr-1" /> Photo
                    </p>
                    <a href={incident.photo_url} target="_blank" rel="noreferrer">
                      <img src={incident.photo_url} alt="Incident" className="w-full h-24 object-cover rounded-lg border border-gray-200 shadow-sm hover:opacity-90" />
                    </a>
                  </div>
                )}
                {incident.voice_note_url && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2 flex items-center">
                      <Mic className="w-3 h-3 mr-1" /> Voice Note
                    </p>
                    <audio src={incident.voice_note_url} controls className="w-full h-10" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
