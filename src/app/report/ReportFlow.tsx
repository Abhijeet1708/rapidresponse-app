'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { 
  HeartPulse, Flame, CloudFog, ShieldAlert, 
  HandMetal, Waves, ZapOff, ArrowDownUp, 
  UserX, Baby, Briefcase, HelpCircle,
  MapPin, CheckCircle, Clock
} from 'lucide-react';

const FloorMapPicker = dynamic(() => import('@/components/FloorMapPicker'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-xl" />
});

const CATEGORIES = [
  { label: 'Medical Emergency', icon: HeartPulse, color: 'bg-red-500' },
  { label: 'Fire', icon: Flame, color: 'bg-orange-500' },
  { label: 'Smoke or Gas Leak', icon: CloudFog, color: 'bg-gray-500' },
  { label: 'Security Threat', icon: ShieldAlert, color: 'bg-red-600' },
  { label: 'Assault or Harassment', icon: HandMetal, color: 'bg-purple-500' },
  { label: 'Flood or Water Damage', icon: Waves, color: 'bg-blue-500' },
  { label: 'Power Failure', icon: ZapOff, color: 'bg-yellow-500' },
  { label: 'Elevator Entrapment', icon: ArrowDownUp, color: 'bg-zinc-600' },
  { label: 'Suspicious Person', icon: UserX, color: 'bg-indigo-500' },
  { label: 'Child Safety', icon: Baby, color: 'bg-pink-500' },
  { label: 'Theft', icon: Briefcase, color: 'bg-emerald-600' },
  { label: 'Other', icon: HelpCircle, color: 'bg-slate-400' },
];

export default function ReportFlow({ 
  propertyId, 
  floorId, 
  floorNumber,
  floorMapUrl
}: { 
  propertyId: string, 
  floorId: string, 
  floorNumber: number,
  floorMapUrl: string
}) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [pinCoordinates, setPinCoordinates] = useState<{x: number, y: number} | null>(null);

  const submitIncident = async () => {
    setIsSubmitting(true);
    const { data, error } = await supabase.from('incidents').insert({
      property_id: propertyId,
      floor_id: floorId,
      category,
      guest_description: description,
      pin_coordinates: pinCoordinates,
      status: 'Reported'
    }).select().single();

    setIsSubmitting(false);
    if (!error && data) {
      setIncidentId(data.id);
      setStep(4);
    } else {
      alert('Failed to submit incident. Please try again.');
    }
  };

  if (step === 4 && incidentId) {
    return (
      <div className="p-6 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Help is on the way</h2>
        <p className="text-gray-600 mb-6">Your incident #{incidentId.split('-')[0]} has been reported.</p>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-gray-700">Status</span>
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
              Reported
            </span>
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <Clock className="w-4 h-4 mr-2" />
            <span>Submitted just now</span>
          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Additional Details (Optional)</h2>
        <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
          <p className="text-sm text-gray-500 mb-2">Category: <span className="font-semibold text-gray-800">{category}</span></p>
          <p className="text-sm text-gray-500 mb-4">Location: Floor {floorNumber}</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={4}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="Describe the situation..."
          />
          <p className="text-right text-xs text-gray-400 mt-1">{description.length}/500</p>
        </div>
        <button
          onClick={submitIncident}
          disabled={isSubmitting}
          className="w-full bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Emergency Report'}
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-2 text-center">Confirm Location</h2>
        <p className="text-gray-500 text-center text-sm mb-4">Tap on the map to place a pin</p>
        <div className="mb-6">
          <FloorMapPicker 
            floorMapUrl={floorMapUrl} 
            onLocationSelect={(coords) => setPinCoordinates(coords)} 
          />
        </div>
        <button
          onClick={() => setStep(3)}
          className="w-full bg-black text-white font-bold py-4 rounded-xl shadow active:scale-95 transition-transform"
        >
          Confirm Location
        </button>
        <button
          onClick={() => setStep(1)}
          className="w-full text-gray-500 font-medium py-4 mt-2"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-center">What is the emergency?</h2>
      <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            onClick={() => {
              setCategory(cat.label);
              setStep(2);
            }}
            className={`${cat.color} text-white rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform min-h-[120px]`}
          >
            <cat.icon className="w-8 h-8 mb-1" />
            <span className="text-sm font-semibold text-center leading-tight">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
