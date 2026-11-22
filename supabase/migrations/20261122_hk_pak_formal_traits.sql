-- Forward copy for HK-PAK-01 only.
-- 20261105_artists_en_columns.sql is already applied, so editing that file does not change the live row.
-- This statement updates artist_id HK-PAK-01, and only formal_traits and formal_traits_en.

update public.artists
set
  formal_traits = '日常透明膠袋、身體空間量度、極簡工作簿',
  formal_traits_en = 'Everyday clear bags, measured body space, a minimal research workbook'
where artist_id = 'HK-PAK-01';
