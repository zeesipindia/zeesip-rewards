import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getGuestSessionIdFromCookies, setGuestSessionCookie } from '@/lib/cookies';

interface SpinSegment {
  label: string;
  value: number;
  probability: number;
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

  // Daily spin has been removed. Authenticated users cannot spin the guest wheel.
  if (user) {
    return NextResponse.json(
      { error: 'Daily spin has been replaced with Sip Match and Sip Slice!' },
      { status: 400 }
    );
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

  // First guest spin ALWAYS gives 30 (Task 4)
  const winningValue = 30;
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
