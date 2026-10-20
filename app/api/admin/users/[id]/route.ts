import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // 1. Fetch full profile
  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 2. Fetch coin_ledger entries sorted by created_at DESC
  const { data: coinLedger } = await adminSupabase
    .from('coin_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // 3. Fetch game_plays entries sorted by played_at DESC
  const { data: gamePlays } = await adminSupabase
    .from('game_plays')
    .select('*')
    .eq('user_id', userId)
    .order('played_at', { ascending: false });

  // Calculate current coin balance
  const balance = (coinLedger || []).reduce((sum, item) => sum + item.amount, 0);

  return NextResponse.json({
    profile,
    balance,
    coin_ledger: coinLedger || [],
    game_plays: gamePlays || [],
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  // Safety: Prevent self-deletion if the caller is authenticated as this user
  try {
    const supabaseUser = await createServerClient();
    const {
      data: { user: callerUser },
    } = await supabaseUser.auth.getUser();
    if (callerUser && callerUser.id === userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own admin account' },
        { status: 400 }
      );
    }
  } catch {}

  const adminSupabase = createAdminClient();

  // 0. Fetch user details first
  const { data: profile, error: profileFetchError } = await adminSupabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', userId)
    .single();

  if (profileFetchError || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Delete in specified order to respect foreign key constraints:
  // 1. Delete from coin_ledger WHERE user_id = userId
  const { error: ledgerError } = await adminSupabase
    .from('coin_ledger')
    .delete()
    .eq('user_id', userId);
  if (ledgerError) {
    console.error('[admin/deleteUser] Failed to delete coin_ledger:', ledgerError);
    return NextResponse.json(
      { error: `Failed to delete coin ledger: ${ledgerError.message}` },
      { status: 500 }
    );
  }

  // 2. Delete from game_plays WHERE user_id = userId
  const { error: gamePlaysError } = await adminSupabase
    .from('game_plays')
    .delete()
    .eq('user_id', userId);
  if (gamePlaysError) {
    console.error('[admin/deleteUser] Failed to delete game_plays:', gamePlaysError);
    return NextResponse.json(
      { error: `Failed to delete game plays: ${gamePlaysError.message}` },
      { status: 500 }
    );
  }

  // 3. Delete from events WHERE user_id = userId
  const { error: eventsError } = await adminSupabase
    .from('events')
    .delete()
    .eq('user_id', userId);
  if (eventsError) {
    console.error('[admin/deleteUser] Failed to delete events:', eventsError);
    return NextResponse.json(
      { error: `Failed to delete events: ${eventsError.message}` },
      { status: 500 }
    );
  }

  // 4. Delete from guest_sessions WHERE claimed_by = userId
  const { error: guestError } = await adminSupabase
    .from('guest_sessions')
    .delete()
    .eq('claimed_by', userId);
  if (guestError) {
    console.error('[admin/deleteUser] Failed to delete guest_sessions:', guestError);
    return NextResponse.json(
      { error: `Failed to delete guest sessions: ${guestError.message}` },
      { status: 500 }
    );
  }

  // 5. Delete from profiles WHERE id = userId
  const { error: profileDeleteError } = await adminSupabase
    .from('profiles')
    .delete()
    .eq('id', userId);
  if (profileDeleteError) {
    console.error('[admin/deleteUser] Failed to delete profile:', profileDeleteError);
    return NextResponse.json(
      { error: `Failed to delete profile: ${profileDeleteError.message}` },
      { status: 500 }
    );
  }

  // 6. Delete the auth user from Supabase Auth using the service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authDeleteError && !authDeleteError.message.toLowerCase().includes('not found')) {
    console.error('[admin/deleteUser] Failed to delete auth user:', authDeleteError);
    return NextResponse.json(
      { error: `Failed to delete auth user: ${authDeleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    deleted_user: {
      name: profile.display_name,
      email: profile.email,
    },
  });
}
