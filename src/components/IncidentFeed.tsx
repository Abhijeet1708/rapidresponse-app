'use client';

import { Incident } from '@/app/staff/StaffDashboardClient';
import { formatDistanceToNow } from 'date-fns';
import { Clock, ShieldAlert, CheckCircle, UserCheck, AlertTriangle } from 'lucide-react';

export default function IncidentFeed({ 
  incidents, 
  onSelect, 
  selectedId 
}: { 
  incidents: Incident[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Reported': return 'bg-red-500 text-white animate-pulse border-red-600';
      case 'Acknowledged': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Responding': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Escalated': return 'bg-amber-100 text-amber-800 border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.5)]';
      case 'Resolved': return 'bg-green-50 text-green-700 border-green-200 opacity-60';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Reported': return <ShieldAlert className="w-4 h-4 mr-1.5" />;
      case 'Acknowledged': return <UserCheck className="w-4 h-4 mr-1.5" />;
      case 'Responding': return <UserCheck className="w-4 h-4 mr-1.5" />;
      case 'Escalated': return <AlertTriangle className="w-4 h-4 mr-1.5" />;
      case 'Resolved': return <CheckCircle className="w-4 h-4 mr-1.5" />;
      default: return <Clock className="w-4 h-4 mr-1.5" />;
    }
  };

  const activeIncidents = incidents.filter(i => i.status !== 'Resolved');
  const recentResolved = incidents.filter(i => i.status === 'Resolved').slice(0, 5);
  const displayIncidents = [...activeIncidents, ...recentResolved];

  if (displayIncidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center space-y-3">
        <CheckCircle className="w-12 h-12 text-gray-200" />
        <p className="font-medium">No active incidents</p>
        <p className="text-xs">All clear on property</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayIncidents.map(incident => (
        <div 
          key={incident.id}
          onClick={() => onSelect(incident.id)}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedId === incident.id 
              ? 'ring-2 ring-black shadow-md bg-white border-transparent z-10 scale-[1.02]' 
              : 'hover:border-gray-300 hover:shadow-sm bg-white'
          } ${incident.status === 'Resolved' ? 'opacity-70 grayscale-[0.5]' : ''}`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border flex items-center shadow-sm ${getStatusColor(incident.status)}`}>
              {getStatusIcon(incident.status)}
              {incident.status}
            </span>
            <span className="text-xs font-mono text-gray-500 flex items-center bg-gray-50 px-2 py-1 rounded">
              <Clock className="w-3 h-3 mr-1" />
              {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
            </span>
          </div>
          
          <h3 className="font-bold text-gray-900 mb-1 leading-tight flex items-center">
            {incident.status === 'Reported' && <div className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></div>}
            {incident.category}
          </h3>
          
          <div className="text-sm text-gray-600 font-medium flex items-center mb-2">
            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-800">
              Floor {incident.floors.floor_number}
            </span>
            <span className="mx-2 text-gray-300">•</span>
            <span className="truncate">{incident.floors.floor_label}</span>
          </div>

          {incident.users && (
            <div className="text-xs text-gray-500 flex items-center mt-3 pt-3 border-t border-gray-100">
              <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold mr-2 text-[10px]">
                {incident.users.name.charAt(0)}
              </div>
              Assigned to {incident.users.name}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
