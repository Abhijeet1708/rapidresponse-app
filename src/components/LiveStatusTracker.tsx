'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Clock, AlertTriangle, UserCheck, ShieldCheck } from 'lucide-react';

export default function LiveStatusTracker({ incidentId }: { incidentId: string }) {
  const [status, setStatus] = useState<string>('Reported');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [showEscalationMessage, setShowEscalationMessage] = useState(false);

  useEffect(() => {
    // Initial fetch
    const fetchStatus = async () => {
      const { data } = await supabase
        .from('incidents')
        .select('status, created_at')
        .eq('id', incidentId)
        .single();
        
      if (data) {
        setStatus(data.status);
        const elapsed = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 1000);
        setElapsedTime(elapsed);
      }
    };
    fetchStatus();

    // Set up real-time subscription
    const channel = supabase
      .channel(`incident_${incidentId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidents', filter: `id=eq.${incidentId}` },
        (payload) => {
          setStatus(payload.new.status);
        }
      )
      .subscribe();

    // Timer for elapsed time and escalation check
    const timer = setInterval(() => {
      setElapsedTime(prev => {
        const next = prev + 1;
        if (next > 90 && status === 'Reported') {
          setShowEscalationMessage(true);
        }
        return next;
      });
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [incidentId, status]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const steps = [
    { label: 'Reported', icon: Clock, isActive: true, isPast: status !== 'Reported' },
    { label: 'Acknowledged', icon: ShieldCheck, isActive: status === 'Acknowledged', isPast: ['Responding', 'Escalated', 'Resolved'].includes(status) },
    { label: 'Responder En Route', icon: UserCheck, isActive: status === 'Responding', isPast: ['Escalated', 'Resolved'].includes(status) },
    { label: 'Resolved', icon: CheckCircle, isActive: status === 'Resolved', isPast: false },
  ];

  // Override step 3 if Escalated
  if (status === 'Escalated') {
    steps[2] = { label: 'Escalated to Emergency Services', icon: AlertTriangle, isActive: true, isPast: false };
  }

  return (
    <div className="p-6 max-w-md mx-auto w-full">
      <div className="text-center mb-8">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Help is on the way</h2>
        <p className="text-gray-500 text-sm">Ref: {incidentId.split('-')[0].toUpperCase()}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-semibold text-gray-800">Live Status</h3>
          <div className="bg-gray-100 px-3 py-1 rounded-full text-sm font-mono text-gray-600 flex items-center">
            <Clock className="w-3 h-3 mr-1.5" />
            {formatTime(elapsedTime)}
          </div>
        </div>

        <div className="relative">
          {/* Progress Line */}
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-100" />
          
          {/* Steps */}
          <div className="space-y-6 relative">
            {steps.map((step, idx) => (
              <div key={step.label} className={`flex items-center ${step.isPast || step.isActive ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-4 border-white ${
                  step.isPast ? 'bg-green-500 text-white' :
                  step.isActive ? (status === 'Escalated' && idx === 2 ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-500 text-white animate-pulse') :
                  'bg-gray-200 text-gray-400'
                }`}>
                  <step.icon className="w-5 h-5" />
                </div>
                <div className="ml-4">
                  <p className={`font-medium ${step.isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                    {step.label}
                  </p>
                  {step.isActive && idx === 0 && (
                    <p className="text-xs text-blue-600 font-medium mt-0.5">Finding nearest available staff...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showEscalationMessage && status === 'Reported' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Escalating to duty manager</p>
            <p className="text-xs text-amber-700 mt-1">Help is on the way. We are prioritizing your request.</p>
          </div>
        </div>
      )}
    </div>
  );
}
