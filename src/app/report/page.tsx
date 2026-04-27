import { verifyGuestToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import ReportFlow from './ReportFlow';
import { notFound } from 'next/navigation';

export default async function ReportPage({ searchParams }: { searchParams: { t?: string } }) {
  const token = searchParams.t;
  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center p-4 text-center">
        <p className="text-xl text-gray-500">Invalid or missing QR token.</p>
      </div>
    );
  }

  const payload = await verifyGuestToken(token);
  if (!payload) {
    return (
      <div className="flex h-screen items-center justify-center p-4 text-center">
        <p className="text-xl text-gray-500">Expired or invalid QR token.</p>
      </div>
    );
  }

  // Fetch property details
  const { data: property } = await supabase
    .from('properties')
    .select('id, name, logo_url')
    .eq('id', payload.propertyId)
    .single();

  if (!property) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 shadow-sm flex items-center justify-center space-x-3">
        {property.logo_url && (
          <img src={property.logo_url} alt={property.name} className="h-8 w-8 object-contain" />
        )}
        <h1 className="text-lg font-bold text-gray-900">{property.name}</h1>
      </div>
      <ReportFlow 
        propertyId={payload.propertyId} 
        floorId={payload.floorId} 
        floorNumber={payload.floorNumber} 
      />
    </main>
  );
}
