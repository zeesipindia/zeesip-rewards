-- Migration 04: Fix coin_ledger source constraint to allow TASK_BONUS and PROFILE_BONUS

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
    'PROFILE_BONUS'
  )
);
