import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Calculate live balance from coin_ledger
  const { data: ledgerEntries, error: ledgerError } = await supabase
    .from('coin_ledger')
    .select('amount')
    .eq('user_id', user.id);

  if (ledgerError) {
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }

  const balance = ledgerEntries ? ledgerEntries.reduce((sum, item) => sum + item.amount, 0) : 0;
  const target = 250;
  const progress_percent = Math.min(100, Math.round((balance / target) * 100));

  return NextResponse.json({
    balance,
    target,
    progress_percent,
  });
}
