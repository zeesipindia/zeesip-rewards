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

  // Fetch current profile to preserve existing fields if not provided
  const { data: existingProfile } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const isNewProfile = !existingProfile || !existingProfile.phone_number;
  const completedTasks = existingProfile?.completed_tasks || {};

  // All profile bonuses removed — completing profile, address, and team gives 0 coins
  if (display_name && phone_number && pincode) {
    completedTasks.profile_completed = true;
  }
  if (address_line1 && city) {
    completedTasks.address_completed = true;
  }
  if (team) {
    completedTasks.team_selected = true;
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
    newlyAwardedCoins: 0,
    isNewProfile,
    completed_tasks: completedTasks,
  });
}
