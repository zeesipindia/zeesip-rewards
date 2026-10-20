import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGuestSessionIdFromCookies, clearGuestSessionCookie } from '@/lib/cookies';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let guestSessionId = await getGuestSessionIdFromCookies();
    let phoneNumber: string | undefined;

    try {
      const body = await req.json();
      if (!guestSessionId && body.guest_session_id) {
        guestSessionId = body.guest_session_id;
      }
      if (body.phone_number) {
        phoneNumber = body.phone_number;
      }
    } catch {
      // Body was empty or invalid JSON
    }

    const adminSupabase = createAdminClient();

    // If phone number was captured on guest first spin, update profile if missing
    if (phoneNumber) {
      const cleaned = phoneNumber.replace(/\D/g, '');
      if (cleaned.length === 10) {
        const { data: prof } = await adminSupabase
          .from('profiles')
          .select('phone_number')
          .eq('id', user.id)
          .single();
        if (prof && !prof.phone_number) {
          await adminSupabase
            .from('profiles')
            .update({ phone_number: cleaned })
            .eq('id', user.id);
        }
      }
    }

    if (!guestSessionId) {
      return NextResponse.json({ success: false, message: 'No guest session found' });
    }

    // Fetch guest session
    const { data: guestSession, error: sessionErr } = await adminSupabase
      .from('guest_sessions')
      .select('*')
      .eq('id', guestSessionId)
      .single();

    if (sessionErr || !guestSession) {
      await clearGuestSessionCookie();
      return NextResponse.json({ success: false, message: 'Guest session not found' });
    }

    // Check if already claimed
    if (guestSession.claimed_by) {
      await clearGuestSessionCookie();
      return NextResponse.json({ success: false, message: 'Guest session already claimed' });
    }

    // ONE-TIME CLAIM GUARD: check if user already has ANY entry with source='GUEST_SPIN' in coin_ledger
    const { count: existingSpins } = await adminSupabase
      .from('coin_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('source', 'GUEST_SPIN');

    if ((existingSpins ?? 0) > 0) {
      await clearGuestSessionCookie();
      return NextResponse.json({ success: false, message: 'Guest spin reward already claimed for this account' });
    }

    const coinsWon = guestSession.coins_won || 30;

    if (coinsWon > 0) {
      // 1. Insert into coin_ledger using Service Role Key
      const { error: ledgerError } = await adminSupabase.from('coin_ledger').insert({
        user_id: user.id,
        amount: coinsWon,
        source: 'GUEST_SPIN',
        description: `Guest spin reward (+${coinsWon} coins)`,
      });

      if (ledgerError) {
        console.error('[claim-guest-coins] Failed to insert into coin_ledger:', ledgerError);
        return NextResponse.json({ error: 'Failed to record coins' }, { status: 500 });
      }

      // 2. Update guest_session as claimed
      await adminSupabase
        .from('guest_sessions')
        .update({
          claimed_by: user.id,
          claimed_at: new Date().toISOString(),
        })
        .eq('id', guestSessionId);

      // 3. Log event
      await adminSupabase.from('events').insert({
        user_id: user.id,
        event_type: 'COINS_TRANSFERRED',
        metadata: { guest_session_id: guestSessionId, amount: coinsWon },
      });
    }

    await clearGuestSessionCookie();

    return NextResponse.json({
      success: true,
      claimedCoins: coinsWon,
    });
  } catch (error) {
    console.error('[claim-guest-coins] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
