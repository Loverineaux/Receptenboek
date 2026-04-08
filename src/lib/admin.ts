import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Check if the current user is an admin.
 */
export async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return data?.role === 'admin';
}

/**
 * Get user ID + admin status. Returns null if not logged in.
 */
export async function getAuthWithAdmin(supabase: SupabaseClient): Promise<{
  userId: string;
  isAdmin: boolean;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return { userId: user.id, isAdmin: data?.role === 'admin' };
}
