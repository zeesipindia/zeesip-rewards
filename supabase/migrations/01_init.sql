-- Phase 1 Migration for Zee Sip Rewards

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  phone_number TEXT,
  pincode TEXT,
  team TEXT CHECK (team IN ('mango', 'pineapple')),
  whatsapp_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. guest_sessions table
CREATE TABLE IF NOT EXISTS public.guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint TEXT,
  coins_won INTEGER NOT NULL DEFAULT 0,
  spin_result INTEGER,
  spun_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. coin_ledger table
CREATE TABLE IF NOT EXISTS public.coin_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (
    source IN (
      'GUEST_SPIN',
      'DAILY_SPIN',
      'SCRATCH',
      'THREE_SIPS',
      'QUICK_SIP',
      'STREAK_BONUS',
      'VERIFIED_BOTTLE',
      'REWARD_REDEMPTION',
      'ADMIN_ADJUSTMENT'
    )
  ),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coin_ledger_user_created ON public.coin_ledger(user_id, created_at DESC);

-- 4. events table (append-only analytics)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.guest_sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'QR_LANDING',
      'GUEST_SPIN_STARTED',
      'GUEST_SPIN_COMPLETED',
      'GOOGLE_AUTH_STARTED',
      'GOOGLE_AUTH_COMPLETED',
      'ACCOUNT_CREATED',
      'PROFILE_COMPLETED',
      'COINS_TRANSFERRED',
      'LOGIN'
    )
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_type_created ON public.events(event_type, created_at DESC);

-- 5. game_config table
CREATE TABLE IF NOT EXISTS public.game_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  spin_segments JSONB NOT NULL,
  first_spin_guaranteed_value INTEGER NOT NULL DEFAULT 50,
  daily_spin_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed data for game_config if missing
INSERT INTO public.game_config (id, spin_segments, first_spin_guaranteed_value, daily_spin_enabled)
VALUES (
  1,
  '[
    {"label": "+25", "value": 25, "probability": 0.25},
    {"label": "+30", "value": 30, "probability": 0.25},
    {"label": "+35", "value": 35, "probability": 0.20},
    {"label": "+40", "value": 40, "probability": 0.15},
    {"label": "+50", "value": 50, "probability": 0.15}
  ]'::jsonb,
  50,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_config ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR profiles
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS POLICIES FOR guest_sessions
DROP POLICY IF EXISTS "Anon insert guest_sessions" ON public.guest_sessions;
CREATE POLICY "Anon insert guest_sessions" ON public.guest_sessions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anon select guest_sessions" ON public.guest_sessions;
CREATE POLICY "Anon select guest_sessions" ON public.guest_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anon update guest_sessions" ON public.guest_sessions;
CREATE POLICY "Anon update guest_sessions" ON public.guest_sessions
  FOR UPDATE USING (true);

-- RLS POLICIES FOR coin_ledger
DROP POLICY IF EXISTS "Users can read their own coin ledger" ON public.coin_ledger;
CREATE POLICY "Users can read their own coin ledger" ON public.coin_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- RLS POLICIES FOR events
DROP POLICY IF EXISTS "Anyone can insert events" ON public.events;
CREATE POLICY "Anyone can insert events" ON public.events
  FOR INSERT WITH CHECK (true);

-- RLS POLICIES FOR game_config
DROP POLICY IF EXISTS "Anyone can select game_config" ON public.game_config;
CREATE POLICY "Anyone can select game_config" ON public.game_config
  FOR SELECT USING (true);
