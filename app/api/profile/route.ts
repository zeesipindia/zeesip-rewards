import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGuestSessionIdFromCookies, clearGuestSessionCookie } from '@/lib/cookies';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { display_name, pincode, phone_number, team, whatsapp_consent } = body;

  // Validation
  if (!display_name || typeof display_name !== 'string' || !display_name.trim()) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
  }

  if (!pincode || !/^\d{6}$/.test(String(pincode).trim())) {
    return NextResponse.json({ error: 'Pincode must be exactly 6 digits' }, { status: 400 });
  }

  const cleanPhone = String(phone_number || '').replace(/\D/g, '').slice(-10);
  if (!/^\d{10}$/.test(cleanPhone)) {
    return NextResponse.json({ error: 'WhatsApp phone number must be 10 digits' }, { status: 400 });
  }

  if (!team || !['mango', 'pineapple'].includes(team)) {
    return NextResponse.json({ error: 'Please select a valid team (Mango or Pineapple)' }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // 1. Upsert profile
  const profilePayload = {
    id: user.id,
    display_name: display_name.trim(),
    email: user.email || '',
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    phone_number: cleanPhone,
    pincode: String(pincode).trim(),
    team,
    whatsapp_consent: Boolean(whatsapp_consent),
  };

  const { error: profileError } = await adminSupabase
    .from('profiles')
    .upsert(profilePayload);

  if (profileError) {
    return NextResponse.json({ error: 'Failed to update profile: ' + profileError.message }, { status: 500 });
  }

  // 2. Transfer guest coins if guest session exists and unclaimed
  const sessionId = await getGuestSessionIdFromCookies();

  if (sessionId) {
    const { data: guestSession } = await adminSupabase
      .from('guest_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (guestSession && guestSession.coins_won > 0 && !guestSession.claimed_at) {
      // Anti-abuse check: Check if phone number or user has already claimed a guest spin before
      const { data: existingClaims } = await adminSupabase
        .from('guest_sessions')
        .select('id')
        .or(`claimed_by.eq.${user.id}`)
        .not('claimed_at', 'is', null);

      const alreadyClaimed = existingClaims && existingClaims.length > 0;

      if (!alreadyClaimed) {
        // Insert into coin_ledger
        await adminSupabase.from('coin_ledger').insert({
          user_id: user.id,
          amount: guestSession.coins_won,
          source: 'GUEST_SPIN',
          description: `Claimed ${guestSession.coins_won} coins from guest spin session ${sessionId}`,
        });

        // Update guest_sessions
        await adminSupabase
          .from('guest_sessions')
          .update({
            claimed_by: user.id,
            claimed_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        // Log events
        await adminSupabase.from('events').insert([
          {
            user_id: user.id,
            session_id: sessionId,
            event_type: 'PROFILE_COMPLETED',
            metadata: { team, pincode },
          },
          {
            user_id: user.id,
            session_id: sessionId,
            event_type: 'COINS_TRANSFERRED',
            metadata: { amount: guestSession.coins_won },
          },
        ]);
      }

      await clearGuestSessionCookie();
    }
  } else {
    // Log PROFILE_COMPLETED event
    await adminSupabase.from('events').insert({
      user_id: user.id,
      event_type: 'PROFILE_COMPLETED',
      metadata: { team, pincode },
    });
  }

  // Calculate new balance
  const { data: ledgerEntries } = await adminSupabase
    .from('coin_ledger')
    .select('amount')
    .eq('user_id', user.id);

  const newBalance = ledgerEntries ? ledgerEntries.reduce((sum, item) => sum + item.amount, 0) : 0;

  return NextResponse.json({
    success: true,
    balance: newBalance,
  });
}
