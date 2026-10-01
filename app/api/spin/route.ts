import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGuestSessionIdFromCookies, setGuestSessionCookie } from '@/lib/cookies';

interface GuestSession {
  id: string;
  device_fingerprint: string | null;
  coins_won: number;
  spin_result: number | null;
  spun_at: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
}

interface SpinSegment {
  label: string;
  value: number;
  probability: number;
}

// In-memory rate limiter: max 10 requests per minute per IP
const ipMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxLimit = 10;

  const record = ipMap.get(ip);
  if (!record || now > record.resetTime) {
    ipMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (record.count >= maxLimit) {
    return true;
  }

  record.count += 1;
  return false;
}

const SEGMENTS = [
  { label: '+25', value: 25, probability: 0.25 },
  { label: '+30', value: 30, probability: 0.25 },
  { label: '+35', value: 35, probability: 0.20 },
  { label: '+40', value: 40, probability: 0.15 },
  { label: '+50', value: 50, probability: 0.15 },
];

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown-ip';
  
  if (checkRateLimit(clientIp)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  }

  const supabase = createAdminClient();
  let sessionId = await getGuestSessionIdFromCookies();
  let sessionData: GuestSession | null = null;

  if (sessionId) {
    const { data } = await supabase
      .from('guest_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    sessionData = data;
  }

  // Create new session if none exists or invalid
  if (!sessionId || !sessionData) {
    const userAgent = req.headers.get('user-agent') || '';
    const { data: newSession, error: createError } = await supabase
      .from('guest_sessions')
      .insert({ device_fingerprint: `${clientIp}-${userAgent.slice(0, 50)}` })
      .select()
      .single();

    if (createError || !newSession) {
      return NextResponse.json({ error: 'Failed to initialize session' }, { status: 500 });
    }

    sessionId = newSession.id;
    sessionData = newSession;
    await setGuestSessionCookie(newSession.id);
  }

  const activeSessionId: string = sessionId!;

  // Check if session already spun
  if (sessionData?.spun_at) {
    return NextResponse.json(
      { error: 'You have already used your spin for this session' },
      { status: 409 }
    );
  }

  // Log GUEST_SPIN_STARTED event
  await supabase.from('events').insert({
    session_id: activeSessionId,
    event_type: 'GUEST_SPIN_STARTED',
    metadata: { ip: clientIp },
  });

  // Fetch game config
  const { data: configData } = await supabase
    .from('game_config')
    .select('*')
    .eq('id', 1)
    .single();

  const guaranteedVal = configData?.first_spin_guaranteed_value ?? 50;
  const segments = configData?.spin_segments || SEGMENTS;

  // Decide spin result on server
  // Guaranteed first spin returns 50 coins!
  const winningValue = guaranteedVal;

  // Find matching segment index
  let segmentIndex = segments.findIndex((s: SpinSegment) => s.value === winningValue);
  if (segmentIndex === -1) {
    segmentIndex = 4; // Fallback to index 4 (+50)
  }

  const spunAt = new Date().toISOString();

  // Update guest session
  const { error: updateError } = await supabase
    .from('guest_sessions')
    .update({
      spin_result: winningValue,
      coins_won: winningValue,
      spun_at: spunAt,
    })
    .eq('id', activeSessionId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to record spin' }, { status: 500 });
  }

  // Log GUEST_SPIN_COMPLETED event
  await supabase.from('events').insert({
    session_id: activeSessionId,
    event_type: 'GUEST_SPIN_COMPLETED',
    metadata: { value: winningValue, segment_index: segmentIndex },
  });

  return NextResponse.json({
    segment_index: segmentIndex,
    value: winningValue,
  });
}
