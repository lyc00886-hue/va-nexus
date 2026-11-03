-- GitHub issue #24. Apply manually in the Supabase SQL editor (JJ).
-- Not run by the app or CI. Apply this file before 20261106_artist_pairs_en.sql.
--
-- VA-Nexus artist library EN body fields
-- DO NOT apply blindly without JJ review.
-- Adds parallel *_en columns (does NOT overwrite zh-Hant body text / name_zh_en).
-- Source: PEANUTS artists-100.en.csv + ming-qing EN CSVs (2026-11-03).
-- App wiring still required: mapDbArtist must pick *_en when locale === "en".

BEGIN;

ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS sba_theme_tags_en text[];
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS formal_traits_en text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS dse_concept_en text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS spld_summary_en text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS origin_en text;

-- Optional: pair theme/medium EN (pairs currently Chinese-only in theme/medium).
ALTER TABLE public.artist_pairs ADD COLUMN IF NOT EXISTS theme_en text;
ALTER TABLE public.artist_pairs ADD COLUMN IF NOT EXISTS medium_en text;

UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['social engagement', 'political critique', 'mass repetition']::text[],
  formal_traits_en = 'Masses of handmade replicas, altered ready-mades, documentary film',
  dse_concept_en = 'Uses art as a tool for social engagement and political critique',
  spld_summary_en = 'Chinese artist. He uses art to speak about society and criticise politics',
  origin_en = 'Installation and conceptual art'
WHERE artist_id = 'CN-AIWW-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Four Monks', 'loyalist', 'symbolic birds-fish']::text[],
  formal_traits_en = 'Sparse birds and fish, “white-eye” look, large voids',
  dse_concept_en = 'Ming loyalist monk-painter; creatures often read as anguish and symbol',
  spld_summary_en = 'Ming–Qing monk painter. Simple birds and fish with striking eyes about feeling.',
  origin_en = 'Ink'
WHERE artist_id = 'CN-BADASHANREN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['urbanisation', 'alternative spaces', 'Pearl River Delta']::text[],
  formal_traits_en = 'Shows in temporary spaces, performance interventions, on-site installation',
  dse_concept_en = '1990s Guangzhou artist collective responding to rapid urbanisation in Guangdong',
  spld_summary_en = 'A 1990s Guangzhou artist group. They showed work in bars and basements about fast-changing cities',
  origin_en = 'Installation, performance and video'
WHERE artist_id = 'CN-BIGTAIL-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['gunpowder', 'explosion', 'cosmos']::text[],
  formal_traits_en = 'Gunpowder burn marks, large outdoor explosion events, chance effects',
  dse_concept_en = 'Uses gunpowder to explore energy, explosion and the cosmos',
  spld_summary_en = 'Chinese artist. He makes pictures by exploding gunpowder and stages huge fireworks',
  origin_en = 'Gunpowder and installation'
WHERE artist_id = 'CN-CAIGQ-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['virtual worlds', 'urban youth', 'alienation']::text[],
  formal_traits_en = 'Virtual game worlds, role-play, documentary video',
  dse_concept_en = 'Explores urban youth alienation through virtual worlds such as RMB City',
  spld_summary_en = 'Chinese artist. She builds cities in online virtual worlds to talk about young people',
  origin_en = 'Video and digital media'
WHERE artist_id = 'CN-CAOFEI-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['xieyi flowers', 'Wu branch']::text[],
  formal_traits_en = 'Freehand flowers, wet ink, simplified forms',
  dse_concept_en = 'Noted xieyi flower painter linking Wu taste to freer ink',
  spld_summary_en = 'Ming painter known for freehand flowers with wet, lively ink.',
  origin_en = 'Ink birds-and-flowers'
WHERE artist_id = 'CN-CHENCHUN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['figure painting', 'fantasy', 'identity']::text[],
  formal_traits_en = 'Archaic, exaggerated figures; print-illustration influence',
  dse_concept_en = 'Odd, antique figures suited to story, role and identity talk',
  spld_summary_en = 'Ming–Qing figure painter. Strange, bold figures good for stories and roles.',
  origin_en = 'Figures / print-related'
WHERE artist_id = 'CN-CHENHS-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['sketching from life', 'poetic mood', 'southern landscape']::text[],
  formal_traits_en = 'Fresh, light colour, compositions from life sketching, concise brushwork',
  dse_concept_en = 'One of the "Three Masters of Lingnan"; creates poetic atmosphere through fresh, natural sketching',
  spld_summary_en = 'One of the "Three Masters of Lingnan". His fresh, natural pictures feel like poems',
  origin_en = 'Ink and colour'
WHERE artist_id = 'CN-CHENSR-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['city', 'absurdity', 'ink animation']::text[],
  formal_traits_en = 'Frame-by-frame ink animation, street photo collage, video',
  dse_concept_en = 'Uses video and ink to explore the absurdity of city life',
  spld_summary_en = 'Chinese artist. He made ink-painting animations about the absurd side of city life',
  origin_en = 'Video and ink animation'
WHERE artist_id = 'CN-CHENSX-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['lyrical abstraction', 'calligraphy', 'light']::text[],
  formal_traits_en = 'Calligraphic strokes, layered light, rich and thin colour',
  dse_concept_en = 'Merges calligraphic strokes with Western light to create lyrical abstraction',
  spld_summary_en = 'Chinese-French abstract painter. His strokes look like calligraphy and glow with light',
  origin_en = 'Oil painting (abstract)'
WHERE artist_id = 'CN-CHUTC-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['minimalism', 'crosses', 'repetition']::text[],
  formal_traits_en = 'Repeated "+" and "×" grids, rational order, dense colour marks',
  dse_concept_en = 'For decades his Appearance of Crosses series has reflected industrial rhythm and reason',
  spld_summary_en = 'Chinese painter. For decades he has painted only crosses, in strict patterns',
  origin_en = 'Painting (abstract)'
WHERE artist_id = 'CN-DINGYI-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Songjiang', 'Southern and Northern Schools', 'literati painting', 'calligraphy']::text[],
  formal_traits_en = 'Landscapes after old masters, abstracted brushwork, pale dry ink',
  dse_concept_en = 'His Southern/Northern Schools theory put brushwork and learning from the past first; it shaped the early-Qing Orthodox School',
  spld_summary_en = 'Late Ming painter-calligrapher and senior official. He split painters into "Southern" and "Northern" schools and stressed brushwork and learning from old masters.',
  origin_en = 'Ink / calligraphy'
WHERE artist_id = 'CN-DONGQC-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Cynical Realism', 'bald figures', 'lost generation']::text[],
  formal_traits_en = 'Bald figures, yawning faces, sky and water backgrounds',
  dse_concept_en = 'Bald figures express the boredom and loss of an era',
  spld_summary_en = 'Chinese painter. His bald figures show a generation that feels bored and lost',
  origin_en = 'Oil painting'
WHERE artist_id = 'CN-FANGLJ-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['East-West synthesis', 'new national painting', 'modern subjects']::text[],
  formal_traits_en = 'Japanese-style washes, Western perspective and light, ink brushwork',
  dse_concept_en = 'A Lingnan School founder who blended East and West and brought modern subjects into Chinese painting',
  spld_summary_en = 'A founder of the Lingnan School. He mixed Chinese and Western methods and painted modern things',
  origin_en = 'Ink and colour'
WHERE artist_id = 'CN-GAOJF-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['birds and animals', 'realism', 'vigour']::text[],
  formal_traits_en = 'Realistic animal forms, water-and-powder splashing, strong movement',
  dse_concept_en = 'One of the "Three Masters of Lingnan", known for powerful, realistic birds and animals',
  spld_summary_en = 'One of the "Three Masters of Lingnan". He painted strong, lifelike birds and animals',
  origin_en = 'Ink and colour'
WHERE artist_id = 'CN-GAOQF-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Eight Eccentrics', 'landscape', 'sparse']::text[],
  formal_traits_en = 'Sparse landscapes, clean ink, literati sketches',
  dse_concept_en = 'Among Eccentrics, leans to spare landscape',
  spld_summary_en = 'Qing Yangzhou Eccentric. Landscapes that stay simple and sparse.',
  origin_en = 'Ink landscape'
WHERE artist_id = 'CN-GAOXIANG-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['landscape', 'sketching from life', 'plum blossom']::text[],
  formal_traits_en = 'Landscapes from life, grand compositions, rich colour',
  dse_concept_en = 'Gao Jianfu''s student and a second-generation Lingnan figure; painted Such Is the Beauty of Our Rivers and Mountains with Fu Baoshi',
  spld_summary_en = 'Gao Jianfu''s student. He painted grand landscapes and was famous for plum blossoms',
  origin_en = 'Ink and colour'
WHERE artist_id = 'CN-GUANSY-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['human hair', 'race', 'cultural fusion']::text[],
  formal_traits_en = 'Hair collected worldwide, hair curtains with pseudo-script, giant installation',
  dse_concept_en = 'Makes giant installations from human hair to explore race and cultural fusion',
  spld_summary_en = 'Chinese artist. He collects hair from people around the world to make giant installations',
  origin_en = 'Installation (human hair)'
WHERE artist_id = 'CN-GUWD-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Four Monks', 'Xin''an School', 'Mount Huang', 'landscape']::text[],
  formal_traits_en = 'Geometric rocks, thin hard lines, large empty areas',
  dse_concept_en = 'Founder of the Xin''an (Anhui) School; followed Ni Zan and drew Mount Huang with clean, cool lines',
  spld_summary_en = 'Late Ming–early Qing monk-painter from Anhui. He painted Mount Huang with clean, simple lines and lots of empty space.',
  origin_en = 'Ink'
WHERE artist_id = 'CN-HONGREN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Eight Eccentrics', 'figures', 'cursive energy']::text[],
  formal_traits_en = 'Freehand figures, cursive into painting, street subjects',
  dse_concept_en = 'Links calligraphic motion to common figures',
  spld_summary_en = 'Qing Yangzhou Eccentric. Freehand figures with cursive-like brush.',
  origin_en = 'Figure xieyi'
WHERE artist_id = 'CN-HUANGSHEN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['avant-garde', 'animals', 'cultural critique']::text[],
  formal_traits_en = 'Live insects and animals, religious symbols, large installation',
  dse_concept_en = 'Founder of Xiamen Dada; uses insects, animals and religious symbols for cultural critique',
  spld_summary_en = 'Chinese avant-garde artist. He used live insects and animals to criticise culture clashes',
  origin_en = 'Installation'
WHERE artist_id = 'CN-HUANGYP-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Yangzhou-related', 'small xieyi', 'figures animals']::text[],
  formal_traits_en = 'Small freehand figures and animals, lively line, popular-elegant mix',
  dse_concept_en = 'Often read with Yangzhou taste; small xieyi figures/animals (seed list inclusion)',
  spld_summary_en = 'Qing painter. Lively small freehand figures and animals; discussed with Yangzhou circles.',
  origin_en = 'Small xieyi'
WHERE artist_id = 'CN-HUAYAN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Eight Eccentrics', 'clerical script', 'plum']::text[],
  formal_traits_en = 'Lacquer-like script, ink plum, epigraphic flavour',
  dse_concept_en = 'Core Yangzhou Eccentric; unique script and plum blossom painting',
  spld_summary_en = 'Qing Yangzhou Eccentric. Unusual calligraphy; famous for plum blossoms.',
  origin_en = 'Painting and calligraphy'
WHERE artist_id = 'CN-JINNONG-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Four Monks', 'Ming loyalist', 'landscape', 'Chan (Zen)']::text[],
  formal_traits_en = 'Dry, scraped brushwork, dense and weighty, rough and rustic',
  dse_concept_en = 'Also called Shixi; paired with Shitao as the "Two Stones"; dense landscapes express reclusion and Chan spirit',
  spld_summary_en = 'Late Ming–early Qing monk-painter from Hunan who lived in Nanjing. Dense, heavy landscapes in dry brush.',
  origin_en = 'Ink and colour'
WHERE artist_id = 'CN-KUNCAN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Yangzhou Eccentrics', 'plum blossom', 'xieyi']::text[],
  formal_traits_en = 'Free-style ink plum, wind-blown bamboo, expressive inscriptions',
  dse_concept_en = 'Dismissed county magistrate who sold paintings around Yangzhou; plum, bamboo, pine and orchid express integrity',
  spld_summary_en = 'Qing painter, one of the Yangzhou Eccentrics and a former county magistrate. Best known for plum blossom and bamboo in wind, with strong brushwork.',
  origin_en = 'Ink'
WHERE artist_id = 'CN-LIFY-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['East-West blend', 'square format', 'folk art']::text[],
  formal_traits_en = 'Square compositions, Impressionist colour and light, folk-art forms',
  dse_concept_en = 'Fused Impressionism and folk art in square compositions to blend East and West',
  spld_summary_en = 'Chinese painter. He used square pictures, mixing Impressionism with folk art',
  origin_en = 'Ink and colour'
WHERE artist_id = 'CN-LINFM-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Eight Eccentrics', 'xieyi birds-flowers']::text[],
  formal_traits_en = 'Bold wet xieyi birds-and-flowers, rich inscriptions',
  dse_concept_en = 'Major Yangzhou freehand flower-and-bird painter',
  spld_summary_en = 'Qing Yangzhou Eccentric. Bold freehand flowers and birds.',
  origin_en = 'Ink birds-and-flowers'
WHERE artist_id = 'CN-LISHAN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['oil-painting pioneer', 'classical realism', 'portraits']::text[],
  formal_traits_en = 'Classical realist oil, solid brushwork, dark-toned portraits',
  dse_concept_en = 'Pioneer of Chinese oil painting with deep mastery of classical realism',
  spld_summary_en = 'Pioneer of Chinese oil painting. He studied abroad early and painted realistically',
  origin_en = 'Oil painting'
WHERE artist_id = 'CN-LITF-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Neo-Realism', 'ordinary people', 'painting on site']::text[],
  formal_traits_en = 'Painting on site, large group portraits, direct brushstrokes',
  dse_concept_en = 'Leading Neo-Realist who focuses on the underclass and the truth of ordinary life',
  spld_summary_en = 'Chinese painter. He paints ordinary people on the spot, showing real life',
  origin_en = 'Oil painting'
WHERE artist_id = 'CN-LIUXD-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Eight Eccentrics', 'ghostly themes', 'figures']::text[],
  formal_traits_en = 'Ghost amusement pictures, portraits, imaginative subjects',
  dse_concept_en = 'Pupil of Jin Nong; pushes literati borders with uncanny subjects',
  spld_summary_en = 'Qing Yangzhou Eccentric. Jin Nong’s student; known for ghostly subjects.',
  origin_en = 'Figures / imaginative themes'
WHERE artist_id = 'CN-LUOPIN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['rural people', 'hyper-realism', 'scale']::text[],
  formal_traits_en = 'Huge portrait, detailed wrinkled skin, photographic realism',
  dse_concept_en = 'Father depicts a farmer in giant hyper-realist scale, pioneering rural realism',
  spld_summary_en = 'Chinese painter. In Father he painted a farmer huge and very lifelike',
  origin_en = 'Oil painting'
WHERE artist_id = 'CN-LUOZL-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['ink', 'abstraction', 'spirituality', 'Zen']::text[],
  formal_traits_en = 'Scorched-ink planes, breathing empty space, abstracted landscape',
  dse_concept_en = 'New Ink painting refines landscape into spiritual abstraction, echoing introspection and vitality',
  spld_summary_en = 'Hong Kong New Ink pioneer. Landscapes become abstract ink shapes, more about the spirit than real scenery',
  origin_en = 'Ink'
WHERE artist_id = 'CN-LV-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['composition', 'forceful brushwork', 'balance']::text[],
  formal_traits_en = 'Hard angular lines, massive rocks, daring but balanced composition',
  dse_concept_en = 'Stresses forceful brushwork and bold composition, creating risk then resolving it into balance',
  spld_summary_en = 'Chinese painter. His bold layouts look unstable at first, then find balance',
  origin_en = 'Ink and colour (finger painting)'
WHERE artist_id = 'CN-PANTS-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['childlike', 'insects and shrimps', 'everyday charm']::text[],
  formal_traits_en = 'Concise brushwork, red flowers with ink leaves, free style with fine-detail insects',
  dse_concept_en = 'Raised humble subjects like shrimps and insects into high art with childlike charm',
  spld_summary_en = 'Chinese painter. Famous for simple, lively shrimps and insects',
  origin_en = 'Ink and colour'
WHERE artist_id = 'CN-QIBS-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Wu School', 'Four Masters of the Ming', 'blue-and-green landscape', 'figures']::text[],
  formal_traits_en = 'Fine-line brushwork, rich blue-and-green colour, detailed figures',
  dse_concept_en = 'Professional painter ranked with Shen Zhou, Wen Zhengming and Tang Yin as the Four Masters of the Ming',
  spld_summary_en = 'Ming painter. Started as an artisan and painted for a living; very fine detail and bright blue-green colours.',
  origin_en = 'Ink and colour on silk / fine-line'
WHERE artist_id = 'CN-QIUYING-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['writing', 'maps', 'history']::text[],
  formal_traits_en = 'Repeated writing, hand-drawn concept maps, text with image',
  dse_concept_en = 'Uses "concept maps" to visualise complex history and philosophy',
  spld_summary_en = 'Chinese artist. He draws "concept maps" that turn history and ideas into maps',
  origin_en = 'Calligraphy, installation and maps'
WHERE artist_id = 'CN-QIUZJ-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['bones', 'survival', 'evolution']::text[],
  formal_traits_en = 'Animal bones assembled into imaginary creatures, specimen display, tech simulation',
  dse_concept_en = 'Uses bones or tech simulations to explore survival and evolution',
  spld_summary_en = 'Chinese artist. He builds animals that never existed out of bones',
  origin_en = 'Installation and sculpture'
WHERE artist_id = 'CN-SHENSM-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Wu School', 'literati', 'landscape']::text[],
  formal_traits_en = 'Steady layered ink, poetry-calligraphy-painting unity',
  dse_concept_en = 'Wu School foundation figure; literati landscape with inscriptions',
  spld_summary_en = 'Ming painter. A key Wu School artist who painted landscapes and wrote poems on them.',
  origin_en = 'Ink painting / calligraphy'
WHERE artist_id = 'CN-SHENZHOU-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Four Monks', 'Ming loyalist', 'landscape', 'painting theory']::text[],
  formal_traits_en = 'Varied compositions, free brushwork, wet and dry, dark and light ink',
  dse_concept_en = 'Ming royal descendant turned monk; argued for "searching out unusual peaks to make sketches" and the "single brushstroke", i.e. learning from nature and innovating',
  spld_summary_en = 'Late Ming–early Qing monk-painter from the Ming royal family. He said artists should look at real mountains, not just copy old masters.',
  origin_en = 'Ink and colour'
WHERE artist_id = 'CN-SHITAO-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['material things', 'family history', 'everyday objects']::text[],
  formal_traits_en = 'Masses of household objects laid out, traces of living, documentary installation',
  dse_concept_en = 'Waste Not displays decades of objects his mother kept, exploring material life and family history',
  spld_summary_en = 'Chinese artist. He displayed the old things his mother had kept for decades',
  origin_en = 'Installation'
WHERE artist_id = 'CN-SONGDONG-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['symbols', 'Mao suit', 'history']::text[],
  formal_traits_en = 'Giant Mao suits, empty shells, cast metal',
  dse_concept_en = 'Reassembles symbols such as the Mao suit as sculpture to reflect on history',
  spld_summary_en = 'Chinese sculptor. He makes giant, empty Mao suits',
  origin_en = 'Sculpture'
WHERE artist_id = 'CN-SUIJG-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Wu School', 'figures', 'scholar-romantic image']::text[],
  formal_traits_en = 'Figures and landscapes with poetic inscriptions',
  dse_concept_en = 'Bridges literati taste and popular subjects; later folk image as Tang Bohu',
  spld_summary_en = 'Ming painter of figures and landscapes; popularly remembered as Tang Bohu.',
  origin_en = 'Ink / figures'
WHERE artist_id = 'CN-TANGYIN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Political Pop', 'consumer signs', 'juxtaposition']::text[],
  formal_traits_en = 'Red Guard imagery × Western brands, high-contrast flat colour',
  dse_concept_en = 'Places political imagery beside brand logos, satirising the merging of ideology and consumerism',
  spld_summary_en = 'Chinese Political Pop. Red Guard images combined with foreign brands',
  origin_en = 'Oil painting / graphic'
WHERE artist_id = 'CN-WANGGY-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Four Wangs', 'Yushan School', 'court', 'landscape']::text[],
  formal_traits_en = 'Synthesis of old masters, detailed compositions, narrative handscrolls',
  dse_concept_en = 'Pupil of Wang Jian and Wang Shimin; combined Song and Yuan styles and led the painting of The Kangxi Emperor''s Southern Inspection Tour',
  spld_summary_en = 'Qing painter, one of the "Four Wangs". He led the team that painted the very long, detailed Kangxi Southern Inspection Tour scrolls.',
  origin_en = 'Ink and colour'
WHERE artist_id = 'CN-WANGHUI-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Four Wangs', 'Orthodox School', 'landscape after old masters']::text[],
  formal_traits_en = 'Careful copies of old styles, ink and blue-green colour, steady brush',
  dse_concept_en = 'One of the Four Wangs; like Wang Shimin he copied Song and Yuan masters, also in blue-and-green',
  spld_summary_en = 'Late Ming–early Qing painter, one of the "Four Wangs". Like Wang Shimin he learned landscape from old masters, sometimes in blue-green colour.',
  origin_en = 'Ink and colour'
WHERE artist_id = 'CN-WANGJIAN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['human body', 'wood', 'social oppression']::text[],
  formal_traits_en = 'Simplified bodies, natural grain and knots kept, rounded organic forms',
  dse_concept_en = 'Stars Group member who uses wood carving to express the body and social oppression',
  spld_summary_en = 'Chinese sculptor. He carves simple bodies in wood and keeps the grain',
  origin_en = 'Wood carving'
WHERE artist_id = 'CN-WANGKP-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['consumerism', 'staged photography', 'satire']::text[],
  formal_traits_en = 'Large staged sets, crowds of actors, bright exaggerated images',
  dse_concept_en = 'Critiques contemporary consumerism through large staged photographs',
  spld_summary_en = 'Chinese photographer. He builds huge sets and photographs them to mock consumerism',
  origin_en = 'Staged photography'
WHERE artist_id = 'CN-WANGQS-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Four Wangs', 'Orthodox School', 'landscape after old masters']::text[],
  formal_traits_en = 'After Huang Gongwang, hemp-fibre strokes, steady composition',
  dse_concept_en = 'Eldest of the Four Wangs; followed Dong Qichang and made copying Yuan masters a method, founding the early-Qing Orthodox School',
  spld_summary_en = 'Late Ming–early Qing painter, eldest of the "Four Wangs". He loved learning from the Yuan master Huang Gongwang; calm, steady landscapes.',
  origin_en = 'Ink'
WHERE artist_id = 'CN-WANGSM-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Eight Eccentrics', 'plum', 'austere mood']::text[],
  formal_traits_en = 'Dense plum, thin lines, austere poetic mood',
  dse_concept_en = 'Known for plum and austere mood among the Eccentrics',
  spld_summary_en = 'Qing Yangzhou Eccentric. Plum blossoms with a spare, bitter-sweet mood.',
  origin_en = 'Painting and calligraphy'
WHERE artist_id = 'CN-WANGSS-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Four Wangs', 'Loudong School', 'court', 'landscape after old masters']::text[],
  formal_traits_en = 'Layered ink, ink and colour blended, almost geometric structure',
  dse_concept_en = 'Grandson of Wang Shimin and a court official; chief editor of the Peiwenzhai painting and calligraphy compendium; used the "dragon vein" idea for composition',
  spld_summary_en = 'Qing painter, grandson of Wang Shimin and a court official. He built landscapes up layer by layer, almost like building blocks.',
  origin_en = 'Ink and colour'
WHERE artist_id = 'CN-WANGYQ-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Wu School', 'calligraphy', 'literati']::text[],
  formal_traits_en = 'Refined brush, famed calligraphy, three perfections',
  dse_concept_en = 'Wu School master balancing painting and calligraphy as cultivated ideal',
  spld_summary_en = 'Ming painter-calligrapher. Famous for both writing and painting in the Wu tradition.',
  origin_en = 'Ink / calligraphy'
WHERE artist_id = 'CN-WENZM-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['fantastic landscape', 'figures', 'distortion']::text[],
  formal_traits_en = 'Strange peaks, warped space, religious/fantastic figures',
  dse_concept_en = 'Opens non-ordinary space and figure imagination',
  spld_summary_en = 'Ming painter of fantastic rocks, spaces and figures.',
  origin_en = 'Ink / colour'
WHERE artist_id = 'CN-WUBIN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['formal beauty', 'point-line-plane', 'Jiangnan']::text[],
  formal_traits_en = 'Ink lines, colour dots, black-white-grey planes',
  dse_concept_en = 'Combines ink lines with Western abstract colour; champions formal beauty',
  spld_summary_en = 'Chinese painter. He used lines, dots and black, white and grey to paint villages, stressing form',
  origin_en = 'Ink and oil painting'
WHERE artist_id = 'CN-WUGZ-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['text', 'absurdity', 'institutions']::text[],
  formal_traits_en = 'Slogan-like large text, absurd actions, borrowed commercial signs',
  dse_concept_en = 'Challenges institutions and logic with text and absurd actions',
  spld_summary_en = 'Chinese artist. He uses masses of words and odd actions to challenge rules',
  origin_en = 'Text installation and performance'
WHERE artist_id = 'CN-WUSZ-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['realism', 'anatomy', 'national spirit']::text[],
  formal_traits_en = 'Academic drawing, accurate anatomy, galloping horses in ink',
  dse_concept_en = 'Brought Western anatomy and drawing into Chinese painting; his horses symbolise national spirit',
  spld_summary_en = 'Chinese painter. He used Western drawing to paint horses as a symbol of national spirit',
  origin_en = 'Ink, oil and drawing'
WHERE artist_id = 'CN-XUBH-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['language', 'text', 'culture']::text[],
  formal_traits_en = 'Invented fake characters, carved woodblock type, English "square word" calligraphy',
  dse_concept_en = 'Works such as Book from the Sky use invented characters to question language and culture',
  spld_summary_en = 'Chinese artist. In Book from the Sky he invented characters nobody can read',
  origin_en = 'Printmaking and installation'
WHERE artist_id = 'CN-XUBING-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['keywords', 'social investigation', 'language']::text[],
  formal_traits_en = 'Interview videos, keyword texts, research archives',
  dse_concept_en = 'Explores keywords and public psychology through social investigation',
  spld_summary_en = 'Chinese artist. He interviews many people to find the key words society uses',
  origin_en = 'Social research, video and text'
WHERE artist_id = 'CN-XUTAN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['xieyi', 'flowers-and-birds', 'expressive ink']::text[],
  formal_traits_en = 'Splashy ink, bold xieyi birds-and-flowers, calligraphic line',
  dse_concept_en = 'Major free-ink voice influencing later Bada, Yangzhou and modern xieyi',
  spld_summary_en = 'Ming painter. Very free ink; powerful freehand flowers and birds.',
  origin_en = 'Ink birds-and-flowers'
WHERE artist_id = 'CN-XUWEI-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['cinematic', 'urban youth', 'uncertainty']::text[],
  formal_traits_en = 'Black-and-white film, slow narrative, multi-screen projection',
  dse_concept_en = 'Shows the uncertainty of young intellectuals with cinematic, decadent beauty',
  spld_summary_en = 'Chinese video artist. His black-and-white films look like old movies about lost young people',
  origin_en = 'Video and film'
WHERE artist_id = 'CN-YANGFD-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['used clothes', 'memory', 'global identity']::text[],
  formal_traits_en = 'Sewn used clothes, suitcase cities, soft sculpture',
  dse_concept_en = 'Makes installations from used clothes to explore memory and global identity',
  spld_summary_en = 'Chinese artist. She makes installations from worn clothes to hold memories',
  origin_en = 'Installation (used clothing)'
WHERE artist_id = 'CN-YINXZ-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Cynical Realism', 'laughing faces', 'satire']::text[],
  formal_traits_en = 'Repeated laughing self-image, bright flat colour, exaggerated expression',
  dse_concept_en = 'Uses his signature laughing face to satirise modern states of mind',
  spld_summary_en = 'Chinese painter. He paints many copies of himself laughing, but the laugh feels empty',
  origin_en = 'Oil painting'
WHERE artist_id = 'CN-YUEMJ-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['lyrical abstraction', 'landscape imagery', 'calligraphic quality']::text[],
  formal_traits_en = 'Calligraphic gestures, abstract oil landscapes, flowing light and colour',
  dse_concept_en = 'Turns the mood of Chinese landscape into Western oil abstraction, more feeling than form',
  spld_summary_en = 'Chinese-French abstract painter. He paints the feeling of landscape in oil, like calligraphy and scenery at once',
  origin_en = 'Oil painting'
WHERE artist_id = 'CN-ZAO-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['masks', 'disguise', 'alienation']::text[],
  formal_traits_en = 'White-masked figures, oversized hands, expressionist brushwork',
  dse_concept_en = 'The Mask series shows disguise and alienation in modern relationships',
  spld_summary_en = 'Chinese painter. His people wear white masks, showing how we hide from each other',
  origin_en = 'Oil painting'
WHERE artist_id = 'CN-ZENGFZ-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['splashed ink and colour', 'tradition', 'abstraction']::text[],
  formal_traits_en = 'Large splashes of ink and colour, mineral blues and greens, small fine details',
  dse_concept_en = 'Peak of splashed-ink-and-colour painting, bridging tradition and modern abstraction',
  spld_summary_en = 'Chinese painter. He splashed ink and colour onto paper, close to abstract art',
  origin_en = 'Ink and colour (splashed ink and colour)'
WHERE artist_id = 'CN-ZHANGDQ-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['body', 'endurance', 'life']::text[],
  formal_traits_en = 'Naked body enduring extreme conditions, photo documentation, incense ash',
  dse_concept_en = 'Explores the essence of life through performances that push the body to its limit',
  spld_summary_en = 'Chinese performance artist. He puts his own body through very hard conditions',
  origin_en = 'Performance and photography'
WHERE artist_id = 'CN-ZHANGH-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['video', 'repetition', 'surveillance']::text[],
  formal_traits_en = 'Long takes, one action repeated, detached observation',
  dse_concept_en = 'Called the father of Chinese video art; explores daily life through repetition and surveillance',
  spld_summary_en = 'Called the father of Chinese video art. He films the same action again and again, like surveillance',
  origin_en = 'Video and installation'
WHERE artist_id = 'CN-ZHANGPL-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['family', 'collective memory', 'bloodline']::text[],
  formal_traits_en = 'Grey-toned bloodline portraits, single light source, marks on faces',
  dse_concept_en = 'Bloodline: Big Family places individual faces within collective historical trauma',
  spld_summary_en = 'Chinese contemporary painter. Greyish family portraits about personal and shared memory',
  origin_en = 'Oil painting'
WHERE artist_id = 'CN-ZHANGXG-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['scholar''s rocks', 'reflection', 'modern landscape']::text[],
  formal_traits_en = 'Stainless-steel copies of scholar''s rocks, mirror reflection, industrial finish',
  dse_concept_en = 'His stainless-steel "artificial rocks" satirise ideas of landscape under modernisation',
  spld_summary_en = 'Chinese sculptor. He makes shiny stainless-steel copies of garden rocks',
  origin_en = 'Sculpture (stainless steel)'
WHERE artist_id = 'CN-ZHANWANG-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Eight Eccentrics', 'bamboo orchid', 'personal script']::text[],
  formal_traits_en = 'Orchid and bamboo; “six-and-a-half” script; sharp colophons',
  dse_concept_en = 'Bamboo/orchid and personal script as literati backbone with popular care',
  spld_summary_en = 'Qing Yangzhou Eccentric. Bamboo and orchid; script called six-and-a-half.',
  origin_en = 'Painting and calligraphy'
WHERE artist_id = 'CN-ZHENGXIE-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['sketching from life', 'landscape', 'animals']::text[],
  formal_traits_en = 'Grounded in life sketching, strong colour, brushwork with an abstract feel',
  dse_concept_en = 'Chao Shao-an''s student; stressed life sketching with a modern abstract feel; influential in Taiwan',
  spld_summary_en = 'Chao Shao-an''s student. He sketched from life and painted landscapes and animals in strong colour',
  origin_en = 'Ink and colour'
WHERE artist_id = 'HK-AUHN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['flowers and birds', 'insects', 'brushwork']::text[],
  formal_traits_en = 'Refined brushwork, light and perspective, lively flowers, birds and insects',
  dse_concept_en = 'Second-generation Lingnan master who taught in Hong Kong; famed for flower-and-bird painting',
  spld_summary_en = 'A second-generation Lingnan master who taught in Hong Kong. Best known for flowers, birds and insects',
  origin_en = 'Ink and colour'
WHERE artist_id = 'HK-CHAOSA-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['film', 'Hong Kong identity', 'social reality']::text[],
  formal_traits_en = 'Repainted film stills, subtitles kept, realistic oil paint',
  dse_concept_en = 'Repaints Hong Kong film stills with subtitles to explore local identity and social reality',
  spld_summary_en = 'Hong Kong painter. He paints scenes from Hong Kong films, subtitles included, to talk about identity',
  origin_en = 'Oil painting'
WHERE artist_id = 'HK-CHOWCF-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['calligraphic line', 'childlike', 'landscape']::text[],
  formal_traits_en = 'Bold calligraphic lines, childlike forms, expansive composition',
  dse_concept_en = 'Hong Kong ink painter who fused calligraphic force with childlike charm',
  spld_summary_en = 'A Hong Kong woman painter. Her lines are bold like calligraphy, with a childlike feel',
  origin_en = 'Ink and calligraphy'
WHERE artist_id = 'HK-FANGZL-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['collective memory', 'nature', 'materials']::text[],
  formal_traits_en = 'Painting on plywood, charcoal and acrylic, traditional landscape compositions',
  dse_concept_en = 'Paints on plywood to explore collective memory and nature',
  spld_summary_en = 'Hong Kong artist. He paints on plywood about shared memories and nature',
  origin_en = 'Mixed media on plywood'
WHERE artist_id = 'HK-LAMTP-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['private space', 'everyday objects', 'emotion']::text[],
  formal_traits_en = 'Hand-painted cloth, household ready-mades, quiet installation',
  dse_concept_en = 'Turns everyday fabrics and household items into installations of emotion and private space',
  spld_summary_en = 'Hong Kong artist. Hand-painted cloth and household things express private feelings',
  origin_en = 'Installation / mixed media'
WHERE artist_id = 'HK-LEEKIT-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['surreal', 'personal world', 'humour']::text[],
  formal_traits_en = 'Delicate lines, humorous text, surreal scenes',
  dse_concept_en = 'Draws a surreal personal world with delicate lines and humorous text',
  spld_summary_en = 'Hong Kong artist. Fine lines and funny words make up her dreamlike world',
  origin_en = 'Painting (fine line and colour)'
WHERE artist_id = 'HK-LEUNG-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Surrealism', 'fantasy city', 'local modernism']::text[],
  formal_traits_en = 'Bright fantasy landscapes, collage-like space, strange creatures',
  dse_concept_en = 'Called the father of Hong Kong contemporary art; rebuilds city memory with surreal imagination',
  spld_summary_en = 'Hong Kong painter. He painted dreamlike cities and strange creatures',
  origin_en = 'Oil / mixed media'
WHERE artist_id = 'HK-LUISCHAN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['urban space', 'everyday ready-mades', 'pressure']::text[],
  formal_traits_en = 'Everyday clear plastic bags, measuring space with the body, minimal process records',
  dse_concept_en = 'Collects the air of a whole flat, making the pressure of cramped housing physical',
  spld_summary_en = 'Hong Kong artist. He filled clear plastic bags with the air of a flat to show how crowded homes are',
  origin_en = 'Conceptual / mixed media'
WHERE artist_id = 'HK-PAK-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['identity', 'gongbi', 'contemporary figures']::text[],
  formal_traits_en = 'Traditional gongbi line, figures in modern dress, playful adaptation',
  dse_concept_en = 'Paints contemporary people with old gongbi methods to explore Hong Kong identity and gender roles',
  spld_summary_en = 'Hong Kong painter. He uses fine gongbi line to paint people of today and costumed characters',
  origin_en = 'Gongbi (fine-line painting)'
WHERE artist_id = 'HK-SHIEH-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['family', 'social space', 'ready-made']::text[],
  formal_traits_en = 'Ready-made collage, everyday materials, spatial installation',
  dse_concept_en = 'Uses ready-made collage to reflect on links between family and social space',
  spld_summary_en = 'Hong Kong artist. He collages found objects to show how family and society connect',
  origin_en = 'Collage and mixed media'
WHERE artist_id = 'HK-TANGKH-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['text', 'religion', 'existence']::text[],
  formal_traits_en = 'Text formed into floral patterns, immersive projection, moving words',
  dse_concept_en = 'Turns text into decorative patterns that look pretty from afar but carry sharp words, discussing religion and existence',
  spld_summary_en = 'Hong Kong artist. He builds patterns out of words; they look pretty until you read them',
  origin_en = 'Installation and video projection'
WHERE artist_id = 'HK-TSANGKW-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['design structure', 'geometric ink', 'landscape']::text[],
  formal_traits_en = 'Geometric division, design-based composition, traditional landscape vocabulary',
  dse_concept_en = 'Reorganises ink landscape with design principles, linking modern vision and tradition',
  spld_summary_en = 'Hong Kong artist. He paints landscapes in ink with geometric design structures',
  origin_en = 'Ink / design'
WHERE artist_id = 'HK-WUCIUS-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['animals', 'flowers and birds', 'brushwork']::text[],
  formal_traits_en = 'Fluid, natural brushwork and delicate colour washes',
  dse_concept_en = 'Second-generation Lingnan painter based in Hong Kong; fluid brushwork and delicate colour',
  spld_summary_en = 'A second-generation Lingnan painter in Hong Kong. Smooth brushwork and delicate colour',
  origin_en = 'Ink and colour'
WHERE artist_id = 'HK-YANGSS-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['sound', 'history', 'politics']::text[],
  formal_traits_en = 'Soundscapes, performance video, graphic scores',
  dse_concept_en = 'Sound artist who explores politics and history through soundscapes',
  spld_summary_en = 'Hong Kong sound artist. He uses sound to explore history and politics',
  origin_en = 'Sound, installation and performance'
WHERE artist_id = 'HK-YOUNG-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['body', 'endurance', 'audience']::text[],
  formal_traits_en = 'Long-duration performance, bodily limits, direct audience contact',
  dse_concept_en = 'Performance art pioneer exploring human limits and endurance',
  spld_summary_en = 'Serbian performance artist. She tests the limits of her own body',
  origin_en = 'Performance art'
WHERE artist_id = 'INTL-ABRAMOVIC-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['fair-faced concrete', 'light', 'nature']::text[],
  formal_traits_en = 'Bare concrete, geometric space, admitted natural light',
  dse_concept_en = 'Creates Zen-like spaces with concrete and light, as in the Church of the Light',
  spld_summary_en = 'Japanese architect. He uses bare concrete and light to make calm spaces',
  origin_en = 'Architecture'
WHERE artist_id = 'INTL-ANDO-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['street', 'satire', 'politics']::text[],
  formal_traits_en = 'Stencil spray paint, dark humour, public walls',
  dse_concept_en = 'Anonymous street artist using graffiti for social and political satire',
  spld_summary_en = 'Anonymous British street artist. He sprays pictures on walls to mock society',
  origin_en = 'Street art (stencil graffiti)'
WHERE artist_id = 'INTL-BANKSY-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['alienation', 'nature', 'technology']::text[],
  formal_traits_en = 'Industrial materials, logos, photography combined with painting',
  dse_concept_en = 'Explores alienation between humans, nature and technology',
  spld_summary_en = 'American artist. He used industrial materials and logos to show people cut off from nature',
  origin_en = 'Mixed media'
WHERE artist_id = 'INTL-BICKERTON-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['motion', 'balance', 'gravity']::text[],
  formal_traits_en = 'Hanging metal shapes, moved by air, flat primary colours',
  dse_concept_en = 'Inventor of the "mobile", exploring gravity and balance',
  spld_summary_en = 'American sculptor. He made hanging sculptures that move and balance',
  origin_en = 'Kinetic sculpture'
WHERE artist_id = 'INTL-CALDER-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['travellers', 'absence', 'body sculpture']::text[],
  formal_traits_en = 'Partly hollowed bodies, bronze, luggage props',
  dse_concept_en = 'The Travellers series uses missing body parts to show migration, loss and being in transit',
  spld_summary_en = 'Contemporary sculptor. Bronze figures with empty middles carry luggage, about travel and loss',
  origin_en = 'Sculpture'
WHERE artist_id = 'INTL-CATALANO-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['wrapping', 'landscape', 'temporary']::text[],
  formal_traits_en = 'Huge fabric wrapping of buildings and land, temporary display',
  dse_concept_en = '"Wrap" landmarks in fabric as land art, e.g. the Wrapped Reichstag',
  spld_summary_en = 'An artist couple. They wrapped whole buildings in giant sheets of fabric',
  origin_en = 'Land art and installation'
WHERE artist_id = 'INTL-CHRISTO-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['autobiography', 'privacy', 'trauma']::text[],
  formal_traits_en = 'Real personal belongings, handwritten neon, sewn fabric',
  dse_concept_en = 'Shows privacy and trauma in autobiographical works such as My Bed',
  spld_summary_en = 'British artist. She showed her own bed and belongings to tell her story',
  origin_en = 'Installation, neon and embroidery'
WHERE artist_id = 'INTL-EMIN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['illusion', 'perception', 'architecture']::text[],
  formal_traits_en = 'Mirror illusions, everyday building scenes, visitor participation',
  dse_concept_en = 'Challenges perception with visual illusion installations',
  spld_summary_en = 'Argentine artist. He uses mirrors and buildings to create illusions you can step into',
  origin_en = 'Illusion installation'
WHERE artist_id = 'INTL-ERLICH-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['life and death', 'specimens', 'commerce']::text[],
  formal_traits_en = 'Animals in formaldehyde, medicine cabinets, grid spot paintings',
  dse_concept_en = 'Uses biological specimens to challenge ideas of life, death and commerce',
  spld_summary_en = 'British artist. He displays animals preserved in liquid to talk about life and death',
  origin_en = 'Installation and sculpture'
WHERE artist_id = 'INTL-HIRST-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['reflection', 'space', 'void']::text[],
  formal_traits_en = 'Mirror-polished steel, deep dark voids, huge scale',
  dse_concept_en = 'Explores reflection, space and void in giant sculpture, e.g. Cloud Gate in Chicago',
  spld_summary_en = 'British-Indian sculptor. His giant mirror sculptures reflect everything around them',
  origin_en = 'Sculpture and installation'
WHERE artist_id = 'INTL-KAPOOR-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['consumerism', 'kitsch', 'enlargement']::text[],
  formal_traits_en = 'Mirror stainless steel, enlarged everyday objects, factory-style production',
  dse_concept_en = 'Turns mass-consumer goods into expensive sculptures, like stainless-steel balloon dogs',
  spld_summary_en = 'American artist. He turns balloon dogs into giant shiny sculptures',
  origin_en = 'Sculpture'
WHERE artist_id = 'INTL-KOONS-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['slogans', 'power', 'consumerism']::text[],
  formal_traits_en = 'Black-and-white photos, white-on-red slogans, addressing the viewer directly',
  dse_concept_en = 'Uses images and slogans to critique power and consumerism',
  spld_summary_en = 'American artist. Black-and-white photos with red slogan bars criticise shopping culture',
  origin_en = 'Photo collage and text'
WHERE artist_id = 'INTL-KRUGER-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['polka dots', 'repetition', 'self-obliteration']::text[],
  formal_traits_en = 'Endless dots, infinity mirror rooms, repeated nets',
  dse_concept_en = 'The "Polka Dot Queen" who explores self-obliteration through repetition',
  spld_summary_en = 'Japanese artist. Dots everywhere, plus mirror rooms that seem endless',
  origin_en = 'Installation and painting'
WHERE artist_id = 'INTL-KUSAMA-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['hyper-realism', 'scale', 'psychology']::text[],
  formal_traits_en = 'Lifelike skin and hair in silicone and resin, deliberately enlarged or shrunk',
  dse_concept_en = 'Hyper-realist figures with shifted scale create psychological tension',
  spld_summary_en = 'Australian sculptor. His people look real but are made huge or tiny',
  origin_en = 'Sculpture (hyper-realist)'
WHERE artist_id = 'INTL-MUECK-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Superflat', 'subculture', 'high and low art']::text[],
  formal_traits_en = 'Anime-style flat colour, cute characters, commercial collaborations',
  dse_concept_en = 'Created "Superflat", blurring high art and subculture',
  spld_summary_en = 'Japanese artist. Flat, cute anime-like style, and works with brands',
  origin_en = 'Painting, sculpture and merchandise'
WHERE artist_id = 'INTL-MURAKAMI-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['biotechnology', 'hybrids', 'ethics']::text[],
  formal_traits_en = 'Lifelike silicone hybrid creatures, human hair, tender poses',
  dse_concept_en = 'Hybrid creature models explore bioengineering and ethics',
  spld_summary_en = 'Australian artist. She makes part-human, part-animal creatures about science ethics',
  origin_en = 'Sculpture (silicone)'
WHERE artist_id = 'INTL-PICCININI-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['role-play', 'images of women', 'media']::text[],
  formal_traits_en = 'Self-portrait role-play, film-still style, make-up and sets',
  dse_concept_en = 'Uses role-play to critique stereotypes of women in media, as in Untitled Film Stills',
  spld_summary_en = 'American photographer. She dresses up as different characters to show how media see women',
  origin_en = 'Photography'
WHERE artist_id = 'INTL-SHERMAN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['life and death', 'faith', 'slow motion']::text[],
  formal_traits_en = 'Extreme slow motion, water and fire, large projection',
  dse_concept_en = 'Master of video art exploring life, death and faith',
  spld_summary_en = 'American video artist. He used very slow footage to explore life and death',
  origin_en = 'Video installation'
WHERE artist_id = 'INTL-VIOLA-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['race', 'history', 'violence']::text[],
  formal_traits_en = 'Black cut-paper silhouettes, room-wide narratives, stark black and white',
  dse_concept_en = 'Uses silhouettes to explore racial violence and history',
  spld_summary_en = 'American artist. Her black paper silhouettes tell stories of race and history',
  origin_en = 'Cut-paper silhouettes and installation'
WHERE artist_id = 'INTL-WALKER-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['distorted figures', 'anxiety', 'existence']::text[],
  formal_traits_en = 'Twisted, blurred figures, cage-like frames, flat intense backgrounds',
  dse_concept_en = 'Distorted figures express post-war existential anxiety',
  spld_summary_en = 'British painter. His twisted figures look full of pain',
  origin_en = 'Oil painting'
WHERE artist_id = 'WEST-BACON-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['chiaroscuro', 'drama', 'ordinary people']::text[],
  formal_traits_en = 'Strong light-dark contrast, dark backgrounds, ordinary people as models',
  dse_concept_en = 'Pioneer of chiaroscuro; used dramatic light and ordinary people in religious scenes',
  spld_summary_en = 'Italian Baroque painter. Strong light and dark, like a spotlight on stage',
  origin_en = 'Oil painting'
WHERE artist_id = 'WEST-CARAVAGGIO-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Surrealism', 'dreams', 'subconscious']::text[],
  formal_traits_en = 'Precise realist technique, melting objects, dreamlike desert space',
  dse_concept_en = 'Surrealist who made dreams and the subconscious visible',
  spld_summary_en = 'Spanish Surrealist. He painted melting clocks, like a dream',
  origin_en = 'Oil painting'
WHERE artist_id = 'WEST-DALI-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['ready-made', 'concept', 'redefining art']::text[],
  formal_traits_en = 'Chosen everyday objects, signature and new title, no handcraft',
  dse_concept_en = 'Creator of the ready-made who redefined art with Fountain',
  spld_summary_en = 'French artist. He signed a urinal and called it art, changing what art means',
  origin_en = 'Ready-made and conceptual art'
WHERE artist_id = 'WEST-DUCHAMP-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['perception', 'light', 'environment', 'viewer''s body']::text[],
  formal_traits_en = 'Artificial light and mist, mirrors, immersive installation',
  dse_concept_en = 'Uses light and water to make viewers aware of their own perception',
  spld_summary_en = 'Icelandic-Danish artist. He makes installations with light, mist and water so we notice how we see',
  origin_en = 'Installation'
WHERE artist_id = 'WEST-ELIASSON-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['loneliness', 'bodily fragility', 'sculptural space']::text[],
  formal_traits_en = 'Extremely thin bronzes, rough surfaces, lonely standing poses',
  dse_concept_en = 'Slender bronze figures symbolise modern fragility and existential anxiety',
  spld_summary_en = 'Swiss sculptor. Very thin bronze figures show loneliness and fragility',
  origin_en = 'Sculpture'
WHERE artist_id = 'WEST-GIACO-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['family', 'the gaze', 'flat colour']::text[],
  formal_traits_en = 'Bright flat colour, multiple viewpoints, intimate interiors',
  dse_concept_en = 'Works such as My Parents use calm composition to examine intimacy and looking',
  spld_summary_en = 'British painter. Bright flat colours of family and swimming pools, with very clear composition',
  origin_en = 'Oil painting'
WHERE artist_id = 'WEST-HOCKNEY-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['urban alienation', 'modern loneliness', 'interior light']::text[],
  formal_traits_en = 'Geometric window frames, strong warm-cool contrast, simplified realism',
  dse_concept_en = 'Uses the glass barrier of a late-night diner to show modern alienation and failed communication',
  spld_summary_en = 'American painter. He painted a late-night diner, using big glass windows and light and dark to show loneliness',
  origin_en = 'Oil painting'
WHERE artist_id = 'WEST-HOPPER-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['identity', 'body', 'pain', 'gender']::text[],
  formal_traits_en = 'Autobiographical symbols, symmetrical composition, vivid local colour',
  dse_concept_en = 'Self-portraits make personal pain and cultural identity visible',
  spld_summary_en = 'Mexican painter. Her self-portraits tell of her body''s pain and her identity',
  origin_en = 'Oil painting'
WHERE artist_id = 'WEST-KAHLO-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['abstraction', 'colour as music', 'point-line-plane']::text[],
  formal_traits_en = 'Points, lines and planes, rhythmic colour, non-figurative composition',
  dse_concept_en = 'Pioneer of abstract art who treated colour like music',
  spld_summary_en = 'Russian abstract painter. He felt colour was like music and painted with dots, lines and shapes',
  origin_en = 'Oil painting'
WHERE artist_id = 'WEST-KANDINSKY-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['observation', 'anatomy', 'Renaissance']::text[],
  formal_traits_en = 'Sfumato, precise anatomical drawing, pyramid composition',
  dse_concept_en = 'Renaissance master who reached a peak of realism through rational observation and anatomy',
  spld_summary_en = 'Italian Renaissance master. He painted the Mona Lisa and studied anatomy closely',
  origin_en = 'Oil painting and drawing'
WHERE artist_id = 'WEST-LEONARDO-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Surrealism', 'image vs reality', 'philosophy']::text[],
  formal_traits_en = 'Displacement, flat brushwork, word-image paradox',
  dse_concept_en = 'Misplaces everyday objects to question the link between "seeing" and "naming"',
  spld_summary_en = 'Belgian Surrealist. Everyday objects in the wrong place challenge reality',
  origin_en = 'Oil painting'
WHERE artist_id = 'WEST-MAGRITTE-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Fauvism', 'colour', 'simplification']::text[],
  formal_traits_en = 'Bold flat colour, simplified outlines, late paper cut-outs',
  dse_concept_en = 'Leader of Fauvism; bold colour and simplified paper cut-outs',
  spld_summary_en = 'French artist. He used bold colours and made paper cut-outs late in life',
  origin_en = 'Oil painting and paper cut-outs'
WHERE artist_id = 'WEST-MATISSE-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['structure', 'primary colours', 'abstract order']::text[],
  formal_traits_en = 'Vertical and horizontal lines, red-yellow-blue, non-narrative grid',
  dse_concept_en = 'Seeks universal order and visual balance through cool abstraction',
  spld_summary_en = 'Dutch abstract painter. Straight lines and red, yellow and blue grids seek order',
  origin_en = 'Oil painting'
WHERE artist_id = 'WEST-MONDRIAN-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Impressionism', 'light', 'painting outdoors']::text[],
  formal_traits_en = 'Short broken strokes, painting outdoors, series of one subject',
  dse_concept_en = 'Leading Impressionist who captured fleeting effects of light',
  spld_summary_en = 'French Impressionist. He painted the same view outdoors many times to catch changing light',
  origin_en = 'Oil painting'
WHERE artist_id = 'WEST-MONET-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['organic form', 'voids', 'reclining figures']::text[],
  formal_traits_en = 'Rounded organic forms, pierced holes, reclining figures',
  dse_concept_en = 'Developed abstract sculpture through organic forms and voids',
  spld_summary_en = 'British sculptor. He made smooth, rounded figures with holes through them',
  origin_en = 'Sculpture'
WHERE artist_id = 'WEST-MOORE-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['flowers', 'close-up scale', 'desert']::text[],
  formal_traits_en = 'Huge close-up flowers, soft gradients, simplified forms',
  dse_concept_en = 'Explores female consciousness through enlarged flowers and desert landscapes',
  spld_summary_en = 'American painter. She painted flowers huge and close-up, and the desert',
  origin_en = 'Oil painting'
WHERE artist_id = 'WEST-OKEEFFE-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['Cubism', 'multiple viewpoints', 'distortion']::text[],
  formal_traits_en = 'Geometric breakdown, many angles at once, collage',
  dse_concept_en = 'Co-founder of Cubism who broke up space and perspective',
  spld_summary_en = 'Spanish artist. In Cubism he showed things from several angles at once',
  origin_en = 'Oil painting, sculpture and collage'
WHERE artist_id = 'WEST-PICASSO-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['action painting', 'chance', 'body movement']::text[],
  formal_traits_en = 'Paint dripped on canvas on the floor, all-over composition, woven lines',
  dse_concept_en = 'Leading action painter whose body movements left accidental beauty',
  spld_summary_en = 'American painter. He laid canvas on the floor and dripped paint on it',
  origin_en = 'Paint and enamel (drip painting)'
WHERE artist_id = 'WEST-POLLOCK-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['colour field', 'contemplation', 'emotional space']::text[],
  formal_traits_en = 'Floating colour blocks, soft feathered edges, close-up immersion',
  dse_concept_en = 'Colour fields create an almost religious space for contemplation, surrounding viewers with emotion',
  spld_summary_en = 'American Colour Field painter. Big soft-edged blocks of colour make people calm and thoughtful',
  origin_en = 'Oil painting'
WHERE artist_id = 'WEST-ROTHKO-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['externalised emotion', 'brushwork', 'colour tension']::text[],
  formal_traits_en = 'Swirling strokes, high-saturation contrast, thick impasto',
  dse_concept_en = 'Uses intense brushwork and colour to externalise inner anxiety and a passion for nature',
  spld_summary_en = 'Dutch painter. Twisting strokes and fierce colour express his emotions',
  origin_en = 'Oil painting'
WHERE artist_id = 'WEST-VANGOGH-01';
UPDATE public.artists SET
  sba_theme_tags_en = ARRAY['consumerism', 'reproduction', 'mass media']::text[],
  formal_traits_en = 'Repeated silkscreen, flat colour, celebrity and product images',
  dse_concept_en = 'Uses mechanical reproduction to dissolve "originality", both criticising and embracing consumerism and media',
  spld_summary_en = 'Pop Art. Repeated soup cans and stars talk about mass media and shopping',
  origin_en = 'Silkscreen / print'
WHERE artist_id = 'WEST-WARHOL-01';

COMMIT;
