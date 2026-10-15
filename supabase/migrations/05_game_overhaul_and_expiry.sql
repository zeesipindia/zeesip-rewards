-- Migration 05: Game overhaul, 14-day expiry, and 30 coin guaranteed first spin

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_game_played_at timestamptz;
UPDATE public.profiles SET last_game_played_at = created_at WHERE last_game_played_at IS NULL;
UPDATE public.game_config SET first_spin_guaranteed_value = 30 WHERE id = 1;

-- Update coin_ledger check constraint for new game sources and expiry
ALTER TABLE public.coin_ledger DROP CONSTRAINT IF EXISTS coin_ledger_source_check;
ALTER TABLE public.coin_ledger ADD CONSTRAINT coin_ledger_source_check CHECK (
  source IN (
    'GUEST_SPIN',
    'DAILY_SPIN',
    'SCRATCH',
    'THREE_SIPS',
    'QUICK_SIP',
    'STREAK_BONUS',
    'VERIFIED_BOTTLE',
    'REWARD_REDEMPTION',
    'ADMIN_ADJUSTMENT',
    'TASK_BONUS',
    'PROFILE_BONUS',
    'SIP_MATCH',
    'SIP_SLICE',
    'EXPIRY'
  )
);

-- Update events check constraint to allow new game event types
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_event_type_check CHECK (
  event_type IN (
    'QR_LANDING',
    'GUEST_SPIN_STARTED',
    'GUEST_SPIN_COMPLETED',
    'GOOGLE_AUTH_STARTED',
    'GOOGLE_AUTH_COMPLETED',
    'ACCOUNT_CREATED',
    'PROFILE_COMPLETED',
    'COINS_TRANSFERRED',
    'LOGIN',
    'DAILY_SPIN_COMPLETED',
    'THREE_SIPS_COMPLETED',
    'PICK_KULKKI_COMPLETED',
    'SCRATCH_COMPLETED',
    'SIP_MATCH_COMPLETED',
    'SIP_SLICE_COMPLETED'
  )
);
