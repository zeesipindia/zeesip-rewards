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
  const { phone_number, display_name } = body;

  const adminSupabase = createAdminClient();

  // Fetch current profile to preserve existing fields
  const { data: existingProfile } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const isNewProfile = !existingProfile || !existingProfile.phone_number;
  const completedTasks = existingProfile?.completed_tasks || {};

  const cleanedPhone = phone_number ? String(phone_number).replace(/\D/g, '') : null;
  if (cleanedPhone) {
    // Prevent multi-account abuse: check if another account already has this phone number
    const { data: duplicate } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('phone_number', cleanedPhone)
      .neq('id', user.id)
      .limit(1);

    if (duplicate && duplicate.length > 0) {
      return NextResponse.json(
        { error: 'This number is already linked to another account. Each number can only be used once.' },
        { status: 409 }
      );
    }

    completedTasks.profile_completed = true;
  }

  // Upsert profile with phone number
  const { error: updateError } = await adminSupabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email || '',
      display_name: display_name || existingProfile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || 'Zee Sipper',
      phone_number: cleanedPhone || existingProfile?.phone_number || null,
      avatar_url: existingProfile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
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
