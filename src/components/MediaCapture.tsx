'use client';

import { useState, useRef } from 'react';
import { Camera, Mic, Square, Trash2 } from 'lucide-react';

export default function MediaCapture({ 
  onPhotoCapture, 
  onAudioCapture 
}: { 
  onPhotoCapture: (file: File | null) => void,
  onAudioCapture: (blob: Blob | null) => void
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(URL.createObjectURL(file));
      onPhotoCapture(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        onAudioCapture(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);

      // Auto stop after 10 seconds
      timerRef.current = setTimeout(() => {
        stopRecording();
      }, 10000);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  };

  const clearAudio = () => {
    setAudioUrl(null);
    onAudioCapture(null);
  };

  const clearPhoto = () => {
    setPhoto(null);
    onPhotoCapture(null);
  };

  return (
    <div className="space-y-4">
      {/* Photo Capture */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800">Attach Photo</h3>
            <p className="text-xs text-gray-500">Optional</p>
          </div>
        </div>
        
        {photo ? (
          <div className="relative w-16 h-16">
            <img src={photo} alt="Captured" className="w-full h-full object-cover rounded-lg shadow-sm" />
            <button 
              onClick={clearPhoto}
              className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md text-red-500"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 shadow-sm cursor-pointer active:scale-95 transition-transform">
            Take Photo
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={handlePhotoChange} 
            />
          </label>
        )}
      </div>

      {/* Voice Note */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800">Voice Note</h3>
            <p className="text-xs text-gray-500">Max 10 seconds</p>
          </div>
        </div>

        {audioUrl ? (
          <div className="flex items-center space-x-2">
            <audio src={audioUrl} controls className="w-32 h-8" />
            <button onClick={clearAudio} className="p-2 text-red-500 bg-white rounded-full shadow-sm">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center space-x-2 active:scale-95 transition-transform ${
              isRecording ? 'bg-red-500 text-white' : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Record</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
