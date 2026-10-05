import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    display_name,
    pincode,
    phone_number,
    team,
    whatsapp_consent,
    delivery_name,
    address_line1,
    address_line2,
    city,
    state,
  } = body;

  const adminSupabase = createAdminClient();

  // Fetch current profile to check completed_tasks
  const { data: existingProfile } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const isNewProfile = !existingProfile || !existingProfile.phone_number;
  const completedTasks = existingProfile?.completed_tasks || {};
  let newlyAwardedCoins = 0;

  // Check 1: Profile completed bonus (+10 coins)
  const isProfileComplete = Boolean(display_name && phone_number && pincode);
  if (isProfileComplete && !completedTasks.profile_completed) {
    completedTasks.profile_completed = true;
    newlyAwardedCoins += 10;
    const { error: insErr } = await adminSupabase.from('coin_ledger').insert({
      user_id: user.id,
      amount: 10,
      source: 'TASK_BONUS',
      description: 'Profile completion bonus (+10 coins)',
    });
    if (insErr) {
      console.error('[profile/route] Error inserting profile bonus:', insErr);
    }
  }

  // Check 2: Delivery address bonus (+10 coins)
  const isAddressComplete = Boolean(address_line1 && city);
  if (isAddressComplete && !completedTasks.address_completed) {
    completedTasks.address_completed = true;
    newlyAwardedCoins += 10;
    const { error: insErr } = await adminSupabase.from('coin_ledger').insert({
      user_id: user.id,
      amount: 10,
      source: 'TASK_BONUS',
      description: 'Delivery address bonus (+10 coins)',
    });
    if (insErr) {
      console.error('[profile/route] Error inserting address bonus:', insErr);
    }
  }

  // Check 3: Team selection bonus (+5 coins)
  const isTeamSelected = Boolean(team);
  if (isTeamSelected && !completedTasks.team_selected) {
    completedTasks.team_selected = true;
    newlyAwardedCoins += 5;
    const { error: insErr } = await adminSupabase.from('coin_ledger').insert({
      user_id: user.id,
      amount: 5,
      source: 'TASK_BONUS',
      description: 'Team selection bonus (+5 coins)',
    });
    if (insErr) {
      console.error('[profile/route] Error inserting team bonus:', insErr);
    }
  }

  // Upsert profile
  const { error: updateError } = await adminSupabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email || '',
      display_name: display_name || existingProfile?.display_name || user.user_metadata?.full_name || 'Sipper',
      phone_number: phone_number || existingProfile?.phone_number || null,
      pincode: pincode || existingProfile?.pincode || null,
      team: team || existingProfile?.team || null,
      whatsapp_consent: whatsapp_consent !== undefined ? whatsapp_consent : existingProfile?.whatsapp_consent ?? true,
      delivery_name: delivery_name || existingProfile?.delivery_name || display_name || null,
      address_line1: address_line1 || existingProfile?.address_line1 || null,
      address_line2: address_line2 || existingProfile?.address_line2 || null,
      city: city || existingProfile?.city || null,
      state: state || existingProfile?.state || 'Kerala',
      completed_tasks: completedTasks,
    });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    newlyAwardedCoins,
    isNewProfile,
    completed_tasks: completedTasks,
  });
}
