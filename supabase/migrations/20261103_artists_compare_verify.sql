-- verify flag from PEANUTS compare-fields JSON (25 true / 91 false)
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS verify boolean DEFAULT false;
