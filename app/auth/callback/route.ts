import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && session?.user) {
      const user = session.user;
      const adminSupabase = createAdminClient();

      // Check if profile exists
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) {
        // Create initial profile row
        await adminSupabase.from('profiles').insert({
          id: user.id,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Zee Sipper',
          email: user.email || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        });

        // Log ACCOUNT_CREATED & GOOGLE_AUTH_COMPLETED events
        await adminSupabase.from('events').insert([
          { user_id: user.id, event_type: 'ACCOUNT_CREATED' },
          { user_id: user.id, event_type: 'GOOGLE_AUTH_COMPLETED' },
        ]);

        return NextResponse.redirect(`${origin}/profile`);
      }

      // Log LOGIN event
      await adminSupabase.from('events').insert({
        user_id: user.id,
        event_type: 'LOGIN',
      });

      // If profile is missing phone or team, redirect to /profile
      if (!profile.phone_number || !profile.team) {
        return NextResponse.redirect(`${origin}/profile`);
      }

      return NextResponse.redirect(`${origin}/home`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
