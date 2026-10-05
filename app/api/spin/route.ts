import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getGuestSessionIdFromCookies, setGuestSessionCookie } from '@/lib/cookies';

interface SpinSegment {
  label: string;
  value: number;
  probability: number;
}

interface EventRow {
  metadata: { value?: number; segment_index?: number } | null;
  created_at: string;
}

interface GuestSessionRow {
  id: string;
  device_fingerprint: string | null;
  coins_won: number;
  spin_result: number | null;
  spun_at: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
}

const SEGMENTS: SpinSegment[] = [
  { label: '+25', value: 25, probability: 0.20 },
  { label: '+30', value: 30, probability: 0.20 },
  { label: '+35', value: 35, probability: 0.15 },
  { label: '+40', value: 40, probability: 0.10 },
  { label: '+50', value: 50, probability: 0.05 },
  { label: 'OOPS', value: 0, probability: 0.30 },
];

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown-ip';
  const supabaseAdmin = createAdminClient();
  const serverSupabase = await createClient();

  const { data: { user } } = await serverSupabase.auth.getUser();

  // If user is authenticated, handle Daily Spin
  if (user) {
    const today = new Date().toISOString().split('T')[0];

    // Check if user has already spun today
    const { data: todaySpins } = await supabaseAdmin
      .from('coin_ledger')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('source', 'DAILY_SPIN')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`);

    if (todaySpins && todaySpins.length > 0) {
      return NextResponse.json(
        { error: 'You have already used your daily spin today. Come back tomorrow!' },
        { status: 409 }
      );
    }

    // Fetch user's spin history
    const { data: userSpins } = await supabaseAdmin
      .from('events')
      .select('metadata, created_at')
      .eq('user_id', user.id)
      .eq('event_type', 'DAILY_SPIN_COMPLETED')
      .order('created_at', { ascending: false })
      .limit(5);

    const typedSpins = (userSpins || []) as EventRow[];
    const spinCount = typedSpins.length;
    const lastSpinValues = typedSpins.map((s) => Number(s.metadata?.value ?? 0));

    // PSYCHOLOGY RULES:
    // Rule 4: New user warmth (first 3 daily spins NEVER give 0 OOPS)
    const allowOops = spinCount >= 3;

    // Rule 2: Streak protection (max 2 OOPS in a row; if last 2 were 0, force a win)
    const lastTwoWereOops = lastSpinValues.length >= 2 && lastSpinValues[0] === 0 && lastSpinValues[1] === 0;
    const forceWin = lastTwoWereOops;

    // Rule 3: Win after drought (if last 5 spins had no win > 25, double weight of 40 and 50)
    const hasHighWinInLastFive = lastSpinValues.some((v) => v > 25);
    const droughtBoost = !hasHighWinInLastFive && spinCount >= 5;

    // Calculate dynamic weights for segments
    const weightedSegments = SEGMENTS.map((seg) => {
      let weight = seg.probability;

      if (seg.value === 0) {
        if (!allowOops || forceWin) weight = 0;
      } else if (droughtBoost && (seg.value === 40 || seg.value === 50)) {
        weight = weight * 2;
      }
      return { ...seg, weight };
    });

    const totalWeight = weightedSegments.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedSegment = weightedSegments[0];

    for (const seg of weightedSegments) {
      if (random <= seg.weight) {
        selectedSegment = seg;
        break;
      }
      random -= seg.weight;
    }

    const winningValue = selectedSegment.value;
    const segmentIndex = SEGMENTS.findIndex((s) => s.value === winningValue);

    // Record in coin_ledger if winningValue > 0
    if (winningValue > 0) {
      await supabaseAdmin.from('coin_ledger').insert({
        user_id: user.id,
        amount: winningValue,
        source: 'DAILY_SPIN',
        description: `Daily spin reward (+${winningValue} coins)`,
      });
    }

    // Log event
    await supabaseAdmin.from('events').insert({
      user_id: user.id,
      event_type: 'DAILY_SPIN_COMPLETED',
      metadata: { value: winningValue, segment_index: segmentIndex },
    });

    return NextResponse.json({
      segment_index: segmentIndex,
      value: winningValue,
    });
  }

  // --- GUEST SPIN FLOW ---
  let sessionId = await getGuestSessionIdFromCookies();
  let sessionData: GuestSessionRow | null = null;

  if (sessionId) {
    const { data } = await supabaseAdmin
      .from('guest_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    sessionData = data as GuestSessionRow | null;
  }

  if (!sessionId || !sessionData) {
    const userAgent = req.headers.get('user-agent') || '';
    const { data: newSession, error: createError } = await supabaseAdmin
      .from('guest_sessions')
      .insert({ device_fingerprint: `${clientIp}-${userAgent.slice(0, 50)}` })
      .select()
      .single();

    if (createError || !newSession) {
      return NextResponse.json({ error: 'Failed to initialize session' }, { status: 500 });
    }

    sessionId = newSession.id;
    sessionData = newSession as GuestSessionRow;
    await setGuestSessionCookie(newSession.id);
  }

  const activeSessionId: string = sessionId!;

  if (sessionData?.spun_at) {
    return NextResponse.json(
      { error: 'You have already used your spin for this session' },
      { status: 409 }
    );
  }

  await supabaseAdmin.from('events').insert({
    session_id: activeSessionId,
    event_type: 'GUEST_SPIN_STARTED',
    metadata: { ip: clientIp },
  });

  // First guest spin ALWAYS gives 50
  const winningValue = 50;
  const segmentIndex = SEGMENTS.findIndex((s) => s.value === winningValue);

  await supabaseAdmin
    .from('guest_sessions')
    .update({
      spin_result: winningValue,
      coins_won: winningValue,
      spun_at: new Date().toISOString(),
    })
    .eq('id', activeSessionId);

  await supabaseAdmin.from('events').insert({
    session_id: activeSessionId,
    event_type: 'GUEST_SPIN_COMPLETED',
    metadata: { value: winningValue, segment_index: segmentIndex },
  });

  return NextResponse.json({
    segment_index: segmentIndex,
    value: winningValue,
    guest_session_id: activeSessionId,
  });
}
