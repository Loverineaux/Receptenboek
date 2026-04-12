import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  // Fetch all users with extraction counts
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, avatar_url, extraction_count')
    .gt('extraction_count', 0)
    .order('extraction_count', { ascending: false });

  const users = (profiles ?? []).map((p: any) => {
    const count = p.extraction_count ?? 0;
    // Donation popup shows at count 1, then every 10th (10, 20, 30...)
    const nextDonation = count < 1 ? 1 : Math.ceil(count / 10) * 10;
    const extractionsUntilDonation = nextDonation - count;
    return {
      id: p.id,
      display_name: p.display_name || 'Onbekend',
      avatar_url: p.avatar_url,
      extraction_count: count,
      next_donation_at: nextDonation,
      extractions_until_donation: extractionsUntilDonation,
    };
  });

  const totalExtractions = users.reduce((sum: number, u: any) => sum + u.extraction_count, 0);

  return NextResponse.json({ users, totalExtractions });
}
