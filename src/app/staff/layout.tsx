import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify staff role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['Responder', 'Manager', 'Admin', 'Superadmin'].includes(profile.role)) {
    // If not a valid staff member, force sign out and redirect
    await supabase.auth.signOut();
    redirect('/login?error=unauthorized');
  }

  return <>{children}</>;
}