-- ==============================================================================
-- SQL CLEANUP: REMOVE DUPLICATE GUEST_SPIN ENTRIES & ENFORCE 1 PER USER
-- ==============================================================================
-- Description:
-- Some users were awarded multiple GUEST_SPIN (+30) rewards due to visiting the
-- landing page again and claiming guest coins multiple times.
-- This script:
--   1. Finds all users with more than one GUEST_SPIN entry in public.coin_ledger.
--   2. Keeps only the FIRST entry (earliest created_at, id) for each user and deletes duplicates.
--   3. Recalculates cached profile balances (if the coins column exists).
--   4. Adds a UNIQUE partial index so a user can NEVER have more than 1 GUEST_SPIN entry.
--   5. Adds the 'claimed' boolean column to guest_sessions and syncs claimed = true.
-- ==============================================================================

BEGIN;

-- 1. Ensure claimed column exists on guest_sessions
ALTER TABLE public.guest_sessions 
ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT false;

-- Sync claimed column with existing records
UPDATE public.guest_sessions
SET claimed = true
WHERE claimed_by IS NOT NULL;

-- 2. Identify and delete duplicate GUEST_SPIN entries in coin_ledger
-- Keeps only the first one (earliest created_at, id) per user
WITH duplicate_spins AS (
  SELECT id,
         user_id,
         created_at,
         ROW_NUMBER() OVER (
           PARTITION BY user_id 
           ORDER BY created_at ASC, id ASC
         ) as row_num
  FROM public.coin_ledger
  WHERE source = 'GUEST_SPIN'
)
DELETE FROM public.coin_ledger
WHERE id IN (
  SELECT id FROM duplicate_spins WHERE row_num > 1
);

-- 3. Recalculate and sync cached user coin balances if the 'coins' column exists on profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'coins'
  ) THEN
    UPDATE public.profiles p
    SET coins = COALESCE((
      SELECT SUM(amount) 
      FROM public.coin_ledger l 
      WHERE l.user_id = p.id
    ), 0);
  END IF;
END $$;

-- 4. Add unique index so duplicate GUEST_SPIN entries are permanently blocked by PostgreSQL
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_guest_spin_per_user
ON public.coin_ledger (user_id)
WHERE source = 'GUEST_SPIN';

COMMIT;

-- 5. Verification query: verify no user has > 1 GUEST_SPIN entry
SELECT user_id, count(*) as guest_spin_count
FROM public.coin_ledger
WHERE source = 'GUEST_SPIN'
GROUP BY user_id
HAVING count(*) > 1;
