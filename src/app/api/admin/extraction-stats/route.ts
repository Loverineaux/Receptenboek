import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

const FREE_EXTRACTIONS_PER_EURO = 10; // €1 = 10 extracties vrij, €2.50 = 25

export async function GET() {
  const supabase = createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, avatar_url, extraction_count, total_donated, donation_free_until')
    .gt('extraction_count', 0)
    .order('extraction_count', { ascending: false });

  const users = (profiles ?? []).map((p: any) => {
    const count = p.extraction_count ?? 0;
    const freeUntil = p.donation_free_until ?? 0;
    const totalDonated = parseFloat(p.total_donated) || 0;

    // Next donation popup: every 10th extraction, but skipped if within free range
    let nextDonation: number;
    if (count < freeUntil) {
      // Still within free range from donation
      nextDonation = freeUntil + (freeUntil % 10 === 0 ? 10 : (10 - freeUntil % 10));
    } else {
      nextDonation = count < 1 ? 1 : Math.ceil(count / 10) * 10;
      if (nextDonation === count) nextDonation += 10;
    }
    const extractionsUntilDonation = Math.max(0, nextDonation - count);

    return {
      id: p.id,
      display_name: p.display_name || 'Onbekend',
      avatar_url: p.avatar_url,
      extraction_count: count,
      total_donated: totalDonated,
      donation_free_until: freeUntil,
      next_donation_at: nextDonation,
      extractions_until_donation: extractionsUntilDonation,
    };
  });

  const totalExtractions = users.reduce((sum: number, u: any) => sum + u.extraction_count, 0);
  const totalDonated = users.reduce((sum: number, u: any) => sum + u.total_donated, 0);

  return NextResponse.json({ users, totalExtractions, totalDonated });
}

/** POST — register a donation for a user */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const { userId, amount } = await request.json();
  if (!userId || !amount || amount <= 0) {
    return NextResponse.json({ error: 'userId en amount zijn verplicht' }, { status: 400 });
  }

  // Get current profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('extraction_count, total_donated, donation_free_until')
    .eq('id', userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 });
  }

  const currentCount = profile.extraction_count ?? 0;
  const currentDonated = parseFloat(profile.total_donated) || 0;
  const freeExtractions = Math.round(amount * FREE_EXTRACTIONS_PER_EURO);
  const newFreeUntil = currentCount + freeExtractions;

  await supabaseAdmin
    .from('profiles')
    .update({
      total_donated: currentDonated + amount,
      donation_free_until: newFreeUntil,
    })
    .eq('id', userId);

  return NextResponse.json({
    total_donated: currentDonated + amount,
    donation_free_until: newFreeUntil,
    free_extractions_added: freeExtractions,
  });
}
