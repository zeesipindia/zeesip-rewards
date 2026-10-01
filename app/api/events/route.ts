import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGuestSessionIdFromCookies } from '@/lib/cookies';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_type, metadata = {}, user_id = null } = body;

    if (!event_type) {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 });
    }

    const sessionId = await getGuestSessionIdFromCookies();
    const adminSupabase = createAdminClient();

    await adminSupabase.from('events').insert({
      event_type,
      user_id,
      session_id: sessionId || null,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
