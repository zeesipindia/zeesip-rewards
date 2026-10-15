-- Migration 06: Function to calculate NET total coins in circulation

CREATE OR REPLACE FUNCTION get_total_coins_in_circulation()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(amount), 0)::integer FROM public.coin_ledger;
$$;
