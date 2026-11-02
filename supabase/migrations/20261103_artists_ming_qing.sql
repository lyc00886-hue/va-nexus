-- VA-Nexus Ming-Qing artist seed (adapted to live artists schema)
-- ON CONFLICT DO NOTHING. Fang Zhaolin stays 麐 on HK-FANGZL-01.
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS name_zh_hans text;

INSERT INTO public.artists (artist_id, name_zh_en, culture_group, sba_theme_tags, formal_traits, dse_concept, spld_summary, origin, source_url, name_zh_hans)
VALUES
('CN-SHENZHOU-01','沈周 (Shen Zhou)','CN_MingQing',ARRAY['吳門','文人畫','山水'],'沉穩筆墨、層層積墨、詩書畫一體','吳門畫派奠基者，以文人山水與題跋展現修養與自然觀','明代畫家。吳門畫派重要人物，畫山水，又會題詩寫字。','水墨／書畫','https://en.wikipedia.org/wiki/Shen_Zhou','沈周'),
('CN-WENZM-01','文徵明 (Wen Zhengming)','CN_MingQing',ARRAY['吳門','書法','文人'],'細筆文秀、書法名家、詩書畫結合','吳門代表，書畫並重，體現文人理想中的雅正與修養','明代書畫家。字同畫都好有名，屬吳門傳統。','水墨／書法','https://en.wikipedia.org/wiki/Wen_Zhengming','文徵明'),
('CN-TANGYIN-01','唐寅 (Tang Yin)','CN_MingQing',ARRAY['吳門','人物','才子'],'人物仕女、山水兼擅、詩文題詠','以才子形象傳世，作品 bridging 文人趣味與通俗題材','明代畫家。畫人物同山水，民間好熟識佢「唐伯虎」形象。','水墨／人物','https://en.wikipedia.org/wiki/Tang_Yin','唐寅'),
('CN-XUWEI-01','徐渭 (Xu Wei)','CN_MingQing',ARRAY['大寫意','花鳥','縱放筆墨'],'潑辣水墨、大寫意花鳥、書法性線條','大寫意一路代表，筆墨縱放影響後來八大、揚州及現代寫意','明代畫家。水墨好放，大寫意花鳥好有力量。','水墨花鳥','https://en.wikipedia.org/wiki/Xu_Wei','徐渭'),
('CN-CHENCHUN-01','陳淳 (Chen Chun)','CN_MingQing',ARRAY['寫意花鳥','吳門支脈'],'寫意花卉、水墨淋漓、簡潔造形','寫意花鳥名家，連繫吳門與後世縱放寫意傳統','明代畫家。寫意花卉出名，墨色淋漓。','水墨花鳥','https://en.wikipedia.org/wiki/Chen_Chun','陈淳'),
('CN-BADASHANREN-01','八大山人／朱耷 (Bada Shanren / Zhu Da)','CN_MingQing',ARRAY['四僧','遺民','符號花鳥'],'簡筆魚鳥、白眼造型、大片留白','明遺民僧人畫家；魚鳥眼神常被讀作孤憤與象徵','明末清初僧人畫家。畫魚鳥好簡，眼神好特別，常講心境。','水墨','https://en.wikipedia.org/wiki/Bada_Shanren','八大山人／朱耷'),
('CN-CHENHS-01','陳洪綬 (Chen Hongshou)','CN_MingQing',ARRAY['人物畫','奇幻','身份'],'古拙人物、誇張造形、版畫插圖影響','人物奇古，適合討論故事、角色同身份再現','明末清初畫家。人物造形古拙誇張，好適合講故事同角色。','人物／版畫相關','https://en.wikipedia.org/wiki/Chen_Hongshou','陈洪绶'),
('CN-WUBIN-01','吳彬 (Wu Bin)','CN_MingQing',ARRAY['奇幻山水','人物','變形'],'奇峭山石、變形空間、宗教／奇幻人物','以奇幻視覺語言打開「非常態」人物同空間想像','明代畫家。山石人物都好奇幻，空間好特別。','水墨／設色','https://en.wikipedia.org/wiki/Wu_Bin_(painter)','吴彬'),
('CN-JINNONG-01','金農 (Jin Nong)','CN_MingQing',ARRAY['揚州八怪','隸書','梅花'],'漆書味楷隸、墨梅、金石氣','揚州八怪核心人物之一，書風獨特，梅作成其標記','清代揚州八怪之一。字體好特別，畫梅花好出名。','書畫','https://en.wikipedia.org/wiki/Jin_Nong','金农'),
('CN-ZHENGXIE-01','鄭燮 (Zheng Xie / Zheng Banqiao)','CN_MingQing',ARRAY['揚州八怪','竹蘭','個性書風'],'蘭竹、六分半書、題跋尖新','以竹蘭同個性書風表達文人風骨同民間關懷','清代揚州八怪之一。畫竹同蘭，字體叫「六分半書」。','書畫','https://en.wikipedia.org/wiki/Zheng_Xie','郑燮'),
('CN-HUANGSHEN-01','黃慎 (Huang Shen)','CN_MingQing',ARRAY['揚州八怪','人物','狂草筆意'],'人物寫意、草書入畫、市井題材','以狂放人物寫意連接書法動作同民間人物','清代揚州八怪之一。人物寫意，筆法好似草書。','人物寫意','https://en.wikipedia.org/wiki/Huang_Shen','黄慎'),
('CN-LISHAN-01','李鱓 (Li Shan)','CN_MingQing',ARRAY['揚州八怪','寫意花鳥'],'大寫意花鳥、水墨淋漓、題跋豐富','揚州寫意花鳥健將，筆墨奔放','清代揚州八怪之一。寫意花鳥，水墨好放。','水墨花鳥','https://en.wikipedia.org/wiki/Li_Shan_(painter)','李鱓'),
('CN-WANGSS-01','汪士慎 (Wang Shishen)','CN_MingQing',ARRAY['揚州八怪','梅花','清苦意境'],'密梅、清瘦筆線、盲後仍創作傳聞與詩意','以梅花同清苦意境見稱，屬揚州八怪書寫性一路','清代揚州八怪之一。畫梅花，意境清苦。','書畫','https://en.wikipedia.org/wiki/Wang_Shishen','汪士慎'),
('CN-GAOXIANG-01','高翔 (Gao Xiang)','CN_MingQing',ARRAY['揚州八怪','山水','疏淡'],'疏淡山水、墨色簡淨、文人小品','揚州八怪中偏山水疏淡一路','清代揚州八怪之一。山水較疏淡簡單。','水墨山水','https://en.wikipedia.org/wiki/Gao_Xiang','高翔'),
('CN-LUOPIN-01','羅聘 (Luo Pin)','CN_MingQing',ARRAY['揚州八怪','鬼趣','人物'],'鬼趣圖、人物肖像、想像題材','金農弟子；以鬼趣等想像題材擴文人畫邊界','清代揚州八怪之一。金農學生，畫過「鬼趣」等題材。','人物／想像題材','https://en.wikipedia.org/wiki/Luo_Pin','罗聘'),
('CN-HUAYAN-01','華嵒 (Hua Yan)','CN_MingQing',ARRAY['揚州相關','小寫意','人物走獸'],'小寫意人物走獸、靈動線描、雅俗共賞','常與揚州畫壇並讀；小寫意人物走獸影響清中葉趣味（名單按 CL／DICK seed 要求納入）','清代畫家。小寫意人物走獸出名，常同揚州畫風一齊討論。','小寫意','https://en.wikipedia.org/wiki/Hua_Yan','华嵒')
ON CONFLICT (artist_id) DO NOTHING;

UPDATE public.artists SET name_zh_hans = '沈周' WHERE artist_id = 'CN-SHENZHOU-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Shen_Zhou' WHERE artist_id = 'CN-SHENZHOU-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '文徵明' WHERE artist_id = 'CN-WENZM-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Wen_Zhengming' WHERE artist_id = 'CN-WENZM-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '唐寅' WHERE artist_id = 'CN-TANGYIN-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Tang_Yin' WHERE artist_id = 'CN-TANGYIN-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '徐渭' WHERE artist_id = 'CN-XUWEI-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Xu_Wei' WHERE artist_id = 'CN-XUWEI-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '陈淳' WHERE artist_id = 'CN-CHENCHUN-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Chen_Chun' WHERE artist_id = 'CN-CHENCHUN-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '八大山人／朱耷' WHERE artist_id = 'CN-BADASHANREN-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Bada_Shanren' WHERE artist_id = 'CN-BADASHANREN-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '陈洪绶' WHERE artist_id = 'CN-CHENHS-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Chen_Hongshou' WHERE artist_id = 'CN-CHENHS-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '吴彬' WHERE artist_id = 'CN-WUBIN-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Wu_Bin_(painter)' WHERE artist_id = 'CN-WUBIN-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '金农' WHERE artist_id = 'CN-JINNONG-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Jin_Nong' WHERE artist_id = 'CN-JINNONG-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '郑燮' WHERE artist_id = 'CN-ZHENGXIE-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Zheng_Xie' WHERE artist_id = 'CN-ZHENGXIE-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '黄慎' WHERE artist_id = 'CN-HUANGSHEN-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Huang_Shen' WHERE artist_id = 'CN-HUANGSHEN-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '李鱓' WHERE artist_id = 'CN-LISHAN-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Li_Shan_(painter)' WHERE artist_id = 'CN-LISHAN-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '汪士慎' WHERE artist_id = 'CN-WANGSS-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Wang_Shishen' WHERE artist_id = 'CN-WANGSS-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '高翔' WHERE artist_id = 'CN-GAOXIANG-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Gao_Xiang' WHERE artist_id = 'CN-GAOXIANG-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '罗聘' WHERE artist_id = 'CN-LUOPIN-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Luo_Pin' WHERE artist_id = 'CN-LUOPIN-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET name_zh_hans = '华嵒' WHERE artist_id = 'CN-HUAYAN-01' AND (name_zh_hans IS NULL OR name_zh_hans = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Hua_Yan' WHERE artist_id = 'CN-HUAYAN-01' AND (source_url IS NULL OR source_url = '');
