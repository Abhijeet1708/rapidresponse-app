'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { 
  HeartPulse, Flame, CloudFog, ShieldAlert, 
  HandMetal, Waves, ZapOff, ArrowDownUp, 
  UserX, Baby, Briefcase, HelpCircle,
  MapPin
} from 'lucide-react';

import MediaCapture from '@/components/MediaCapture';

import LiveStatusTracker from '@/components/LiveStatusTracker';

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
  const [photo, setPhoto] = useState<File | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);

  const uploadMedia = async (file: Blob, path: string) => {
    const { data, error } = await supabase.storage.from('incident-media').upload(path, file);
    if (error) {
      console.error('Upload failed', error);
      return null;
    }
    return supabase.storage.from('incident-media').getPublicUrl(data.path).data.publicUrl;
  };

  const submitIncident = async () => {
    setIsSubmitting(true);
    
    let photoUrl = null;
    let audioUrl = null;

    if (photo) {
      photoUrl = await uploadMedia(photo, `${propertyId}/${Date.now()}-photo.jpg`);
    }
    if (audio) {
      audioUrl = await uploadMedia(audio, `${propertyId}/${Date.now()}-audio.webm`);
    }

    const { data, error } = await supabase.from('incidents').insert({
      property_id: propertyId,
      floor_id: floorId,
      category,
      guest_description: description,
      pin_coordinates: pinCoordinates,
      photo_url: photoUrl,
      voice_note_url: audioUrl,
      status: 'Reported'
    }).select().single();

    setIsSubmitting(false);
    if (!error && data) {
      setIncidentId(data.id);
      setStep(5);
    } else {
      alert('Failed to submit incident. Please try again.');
    }
  };

  if (step === 5 && incidentId) {
    return <LiveStatusTracker incidentId={incidentId} />;
  }

  if (step === 4) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">Review Report</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center">
              <ShieldAlert className="w-5 h-5 mr-2 text-red-500" />
              {category}
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start">
              <MapPin className="w-5 h-5 mr-2 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">Floor {floorNumber}</p>
                {pinCoordinates && <p className="text-xs text-gray-500">Pin dropped on map</p>}
              </div>
            </div>
            
            {description && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-sm text-gray-600">&quot;{description}&quot;</p>
              </div>
            )}
            
            {(photo || audio) && (
              <div className="pt-3 border-t border-gray-50 flex gap-2">
                {photo && <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded font-medium">Photo attached</span>}
                {audio && <span className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded font-medium">Voice note attached</span>}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={submitIncident}
          disabled={isSubmitting}
          className="w-full bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center text-lg"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Emergency Report'}
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={isSubmitting}
          className="w-full text-gray-500 font-medium py-4 mt-2 disabled:opacity-50"
        >
          Back to Edit
        </button>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">Additional Details (Optional)</h2>
        <div className="bg-white p-4 rounded-xl shadow-sm mb-4 space-y-4">
          <MediaCapture 
            onPhotoCapture={setPhoto} 
            onAudioCapture={setAudio} 
          />
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50"
              placeholder="Describe the situation..."
            />
            <p className="text-right text-xs text-gray-400 mt-1">{description.length}/500</p>
          </div>
        </div>
        <button
          onClick={() => setStep(4)}
          className="w-full bg-black text-white font-bold py-4 rounded-xl shadow active:scale-95 transition-transform"
        >
          Continue to Review
        </button>
        <button
          onClick={() => setStep(2)}
          className="w-full text-gray-500 font-medium py-4 mt-2"
        >
          Back
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
