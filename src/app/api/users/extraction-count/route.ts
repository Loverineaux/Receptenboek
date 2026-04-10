import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** POST — increment extraction count, return new value */
export async function POST(_request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  // Fetch current count
  const { data: profile } = await supabase
    .from('profiles')
    .select('extraction_count')
    .eq('id', user.id)
    .single();

  const currentCount = profile?.extraction_count ?? 0;
  const newCount = currentCount + 1;

  await supabase
    .from('profiles')
    .update({ extraction_count: newCount })
    .eq('id', user.id);

  return NextResponse.json({ count: newCount });
}
