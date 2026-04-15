import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** POST — increment extraction count, return new value */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  // Support incrementing by more than 1 (e.g. bulk import with multiple URLs)
  let amount = 1;
  try {
    const body = await request.json();
    if (body?.amount && Number.isInteger(body.amount) && body.amount > 0) {
      amount = body.amount;
    }
  } catch {
    // No body or invalid JSON — default to 1
  }

  // Fetch current count + donation status
  const { data: profile } = await supabase
    .from('profiles')
    .select('extraction_count, total_donated, donation_free_until')
    .eq('id', user.id)
    .single();

  const currentCount = profile?.extraction_count ?? 0;
  const donationFreeUntil = profile?.donation_free_until ?? 0;
  const newCount = currentCount + amount;

  await supabase
    .from('profiles')
    .update({ extraction_count: newCount })
    .eq('id', user.id);

  // Popup logic:
  // - Within free range (donated): no popup
  // - Outside free range: at #1, then every 5 extractions
  let shouldShowDonation = false;
  if (newCount <= donationFreeUntil) {
    shouldShowDonation = false;
  } else {
    // Check if we crossed a milestone during this increment
    const prevMilestone = currentCount <= 0 ? 0 : Math.floor(currentCount / 5);
    const newMilestone = Math.floor(newCount / 5);
    shouldShowDonation = currentCount === 0 || prevMilestone !== newMilestone;
  }

  return NextResponse.json({ count: newCount, showDonation: shouldShowDonation });
}
