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

  // Fetch current count + donation status
  const { data: profile } = await supabase
    .from('profiles')
    .select('extraction_count, total_donated, donation_free_until')
    .eq('id', user.id)
    .single();

  const currentCount = profile?.extraction_count ?? 0;
  const totalDonated = parseFloat(profile?.total_donated) || 0;
  const donationFreeUntil = profile?.donation_free_until ?? 0;
  const newCount = currentCount + 1;

  await supabase
    .from('profiles')
    .update({ extraction_count: newCount })
    .eq('id', user.id);

  // Popup logic:
  // - Within free range (donated): no popup
  // - Never donated: at #1, then every 5 extractions
  // - Has donated but free range expired: every 10 extractions
  let shouldShowDonation = false;
  if (newCount <= donationFreeUntil) {
    shouldShowDonation = false;
  } else if (totalDonated > 0) {
    shouldShowDonation = newCount % 10 === 0;
  } else {
    shouldShowDonation = newCount === 1 || newCount % 5 === 0;
  }

  return NextResponse.json({ count: newCount, showDonation: shouldShowDonation });
}
