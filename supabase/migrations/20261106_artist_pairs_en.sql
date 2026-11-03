-- GitHub issue #24. Apply manually in the Supabase SQL editor (JJ).
-- Not run by the app or CI. Apply after 20261105_artists_en_columns.sql
-- (that file adds artist_pairs.theme_en and artist_pairs.medium_en).
--
-- Pair theme/medium EN backfill (draft PEANUTS translations).
-- Apply after artists-en-columns.sql ALTER for theme_en/medium_en.
BEGIN;
UPDATE public.artist_pairs SET theme_en = 'Observational realism & anatomy', medium_en = 'Oil/drawing · ink drawing' WHERE id = 'PAIR-REALISM-01';
UPDATE public.artist_pairs SET theme_en = 'Everyday realism & on-site truth', medium_en = 'Oil painting' WHERE id = 'PAIR-REALISM-02';
UPDATE public.artist_pairs SET theme_en = 'Impressionist colour-light & East–West blend', medium_en = 'Oil · colour ink' WHERE id = 'PAIR-IMPRESS-01';
UPDATE public.artist_pairs SET theme_en = 'Breaking with tradition', medium_en = 'Oil · splash-ink/colour' WHERE id = 'PAIR-BREAK-01';
UPDATE public.artist_pairs SET theme_en = 'Simplification & childlike play', medium_en = 'Oil/collage · ink' WHERE id = 'PAIR-SIMPLE-01';
UPDATE public.artist_pairs SET theme_en = 'Dream & surrealism', medium_en = 'Oil · fine-line painting' WHERE id = 'PAIR-DREAM-01';
UPDATE public.artist_pairs SET theme_en = 'Point, line, plane & formal beauty', medium_en = 'Oil · ink' WHERE id = 'PAIR-FORM-01';
UPDATE public.artist_pairs SET theme_en = 'Ways of seeing flowers', medium_en = 'Oil · ink' WHERE id = 'PAIR-FLOWER-01';
UPDATE public.artist_pairs SET theme_en = 'Organic form & carving', medium_en = 'Sculpture' WHERE id = 'PAIR-CARVE-01';
UPDATE public.artist_pairs SET theme_en = 'Anxiety & expressive portraiture', medium_en = 'Oil painting' WHERE id = 'PAIR-ANXIETY-01';
UPDATE public.artist_pairs SET theme_en = 'Body gesture & calligraphic stroke', medium_en = 'Abstract oil' WHERE id = 'PAIR-GESTURE-01';
UPDATE public.artist_pairs SET theme_en = 'Concept & redefinition', medium_en = 'Ready-made · print/install' WHERE id = 'PAIR-CONCEPT-01';
UPDATE public.artist_pairs SET theme_en = 'Art as social critique', medium_en = 'Street art · installation' WHERE id = 'PAIR-PROTEST-01';
UPDATE public.artist_pairs SET theme_en = 'Repeated pattern', medium_en = 'Installation · abstract painting' WHERE id = 'PAIR-REPEAT-01';
UPDATE public.artist_pairs SET theme_en = 'Film image & identity', medium_en = 'Photography · oil' WHERE id = 'PAIR-FILM-01';
UPDATE public.artist_pairs SET theme_en = 'Video & time', medium_en = 'Video' WHERE id = 'PAIR-VIDEO-01';
UPDATE public.artist_pairs SET theme_en = 'Body & endurance', medium_en = 'Performance' WHERE id = 'PAIR-ENDURE-01';
UPDATE public.artist_pairs SET theme_en = 'Mirrored steel & reflection', medium_en = 'Stainless sculpture' WHERE id = 'PAIR-MIRROR-01';
UPDATE public.artist_pairs SET theme_en = 'Race & history', medium_en = 'Silhouette · hair installation' WHERE id = 'PAIR-RACE-01';
UPDATE public.artist_pairs SET theme_en = 'Subculture & virtual worlds', medium_en = 'Painting/sculpture · digital' WHERE id = 'PAIR-SUBCULTURE-01';
UPDATE public.artist_pairs SET theme_en = 'Icons & sculpture', medium_en = 'Sculpture' WHERE id = 'PAIR-ICON-01';
UPDATE public.artist_pairs SET theme_en = 'Life, death & specimens', medium_en = 'Installation / sculpture' WHERE id = 'PAIR-LIFEDEATH-01';
UPDATE public.artist_pairs SET theme_en = 'Balance & tension', medium_en = 'Kinetic sculpture · ink' WHERE id = 'PAIR-BALANCE-01';
UPDATE public.artist_pairs SET theme_en = 'Hyperrealism & scale', medium_en = 'Sculpture · oil' WHERE id = 'PAIR-SCALE-01';
UPDATE public.artist_pairs SET theme_en = 'Nature, material & space', medium_en = 'Architecture · plywood painting' WHERE id = 'PAIR-NATURE-01';
UPDATE public.artist_pairs SET theme_en = 'Critique of consumerism', medium_en = 'Photo collage · staged photo' WHERE id = 'PAIR-CONSUMER-02';
UPDATE public.artist_pairs SET theme_en = 'Private objects & autobiography', medium_en = 'Installation' WHERE id = 'PAIR-PRIVATE-01';
UPDATE public.artist_pairs SET theme_en = 'Creatures, ethics & culture', medium_en = 'Sculpture · installation' WHERE id = 'PAIR-CREATURE-01';
UPDATE public.artist_pairs SET theme_en = 'Large ephemeral events', medium_en = 'Land art · gunpowder' WHERE id = 'PAIR-LANDART-01';
UPDATE public.artist_pairs SET theme_en = 'Illusion & looking', medium_en = 'Illusion install · text projection' WHERE id = 'PAIR-ILLUSION-01';
UPDATE public.artist_pairs SET theme_en = 'People, nature & urban alienation', medium_en = 'Mixed media · install/action' WHERE id = 'PAIR-URBAN-02';
UPDATE public.artist_pairs SET theme_en = 'Two paths of East–West fusion', medium_en = 'Oil · ink' WHERE id = 'PAIR-FUSION-01';
UPDATE public.artist_pairs SET theme_en = 'Lingnan birds & animals', medium_en = 'Ink colour' WHERE id = 'PAIR-ANIMAL-01';
UPDATE public.artist_pairs SET theme_en = 'Lingnan landscape from life', medium_en = 'Ink colour' WHERE id = 'PAIR-LANDSCAPE-01';
UPDATE public.artist_pairs SET theme_en = 'Personal faces of HK ink', medium_en = 'Ink colour' WHERE id = 'PAIR-INKHK-01';
UPDATE public.artist_pairs SET theme_en = 'Cynical realism', medium_en = 'Oil painting' WHERE id = 'PAIR-CYNICAL-01';
UPDATE public.artist_pairs SET theme_en = 'Video & sound media', medium_en = 'Video · sound install' WHERE id = 'PAIR-MEDIA-01';
UPDATE public.artist_pairs SET theme_en = 'Pearl River Delta city', medium_en = 'Video · social inquiry' WHERE id = 'PAIR-URBAN-03';
UPDATE public.artist_pairs SET theme_en = 'Text & concept', medium_en = 'Text install · calligraphy' WHERE id = 'PAIR-TEXT-01';
UPDATE public.artist_pairs SET theme_en = 'Old objects & family memory', medium_en = 'Installation · collage' WHERE id = 'PAIR-MEMORY-01';
COMMIT;
