import { createClient } from '@/lib/supabase-server';
import StaffDashboardClient from './StaffDashboardClient';
import { redirect } from 'next/navigation';

export default async function StaffDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('id, property_id, role, name, avatar_url')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <StaffDashboardClient 
      propertyId={profile.property_id} 
      userProfile={profile} 
    />
  );
}
