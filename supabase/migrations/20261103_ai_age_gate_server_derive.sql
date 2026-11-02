-- Server-derived 18+ AI gate: can_use_ai always follows birth_year;
-- clients cannot forge can_use_ai=true. RPCs avoid selecting birth_year.

CREATE OR REPLACE FUNCTION public.derive_can_use_ai(p_birth_year integer)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_birth_year IS NULL THEN false
    WHEN p_birth_year < 1900 OR p_birth_year > EXTRACT(YEAR FROM CURRENT_DATE)::int THEN false
    ELSE (EXTRACT(YEAR FROM CURRENT_DATE)::int - p_birth_year) >= 18
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_progress_enforce_can_use_ai()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.can_use_ai := public.derive_can_use_ai(NEW.birth_year);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_progress_enforce_can_use_ai ON public.user_progress;
CREATE TRIGGER user_progress_enforce_can_use_ai
  BEFORE INSERT OR UPDATE OF birth_year, can_use_ai ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.user_progress_enforce_can_use_ai();

UPDATE public.user_progress
SET can_use_ai = public.derive_can_use_ai(birth_year);

CREATE OR REPLACE FUNCTION public.get_ai_age_gate()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('can_use_ai', false, 'has_birth_year', false);
  END IF;
  SELECT up.can_use_ai, (up.birth_year IS NOT NULL) AS has_birth_year
  INTO r
  FROM public.user_progress up
  WHERE up.user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN json_build_object('can_use_ai', false, 'has_birth_year', false);
  END IF;
  RETURN json_build_object(
    'can_use_ai', COALESCE(r.can_use_ai, false),
    'has_birth_year', r.has_birth_year
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ai_birth_year(p_year integer)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  max_year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  empty_game jsonb := jsonb_build_object(
    'version', 1,
    'xp', 0,
    'streak', jsonb_build_object('count', 0, 'best', 0, 'lastDate', null),
    'nodes', '{}'::jsonb,
    'quests', '{}'::jsonb,
    'badges', '{}'::jsonb,
    'activity', '[]'::jsonb,
    'awarded', '{}'::jsonb,
    'prefs', jsonb_build_object('hearts', true)
  );
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_year IS NULL OR p_year < 1900 OR p_year > max_year THEN
    RAISE EXCEPTION 'invalid_birth_year';
  END IF;
  INSERT INTO public.user_progress (user_id, game, birth_year, updated_at)
  VALUES (uid, empty_game, p_year, now())
  ON CONFLICT (user_id) DO UPDATE
    SET birth_year = EXCLUDED.birth_year,
        updated_at = now();
  RETURN public.get_ai_age_gate();
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_ai_birth_year()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  UPDATE public.user_progress
  SET birth_year = NULL, updated_at = now()
  WHERE user_id = uid;
  RETURN public.get_ai_age_gate();
END;
$$;

GRANT EXECUTE ON FUNCTION public.derive_can_use_ai(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_age_gate() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_ai_birth_year(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_ai_birth_year() TO authenticated;
