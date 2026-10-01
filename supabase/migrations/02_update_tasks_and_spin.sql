-- Phase 1 Restructure Migration (Tasks, Address, Spin Segments)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS delivery_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line1 text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line2 text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text DEFAULT 'Kerala';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completed_tasks jsonb DEFAULT '{}'::jsonb;

UPDATE public.game_config SET spin_segments = '[
  {"label": "+25", "value": 25, "probability": 0.20},
  {"label": "+30", "value": 30, "probability": 0.20},
  {"label": "+35", "value": 35, "probability": 0.15},
  {"label": "+40", "value": 40, "probability": 0.10},
  {"label": "+50", "value": 50, "probability": 0.05},
  {"label": "OOPS", "value": 0, "probability": 0.30}
]'::jsonb WHERE id = 1;
