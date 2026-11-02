-- VA-Nexus artists-100 seed extension
-- DO NOT apply blindly without JJ review. Uses ON CONFLICT DO NOTHING.
-- Adds source_url column; inserts 80 new artists + 40 new pairs; backfills source_url for original 20.

ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS name_zh_hans text;

-- Backfill source_url for original 20 (only if null)
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Edward_Hopper' WHERE artist_id = 'WEST-HOPPER-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://www.mplus.org.hk/en/collection/makers/pak-sheung-chuen/' WHERE artist_id = 'HK-PAK-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Vincent_van_Gogh' WHERE artist_id = 'WEST-VANGOGH-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Lui_Shou-Kwan' WHERE artist_id = 'CN-LV-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Mark_Rothko' WHERE artist_id = 'WEST-ROTHKO-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Zao_Wou-Ki' WHERE artist_id = 'CN-ZAO-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Andy_Warhol' WHERE artist_id = 'WEST-WARHOL-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Wang_Guangyi' WHERE artist_id = 'CN-WANGGY-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Frida_Kahlo' WHERE artist_id = 'WEST-KAHLO-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Wilson_Shieh' WHERE artist_id = 'HK-SHIEH-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Ren%C3%A9_Magritte' WHERE artist_id = 'WEST-MAGRITTE-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://www.mplus.org.hk/en/collection/makers/luis-chan/' WHERE artist_id = 'HK-LUISCHAN-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Olafur_Eliasson' WHERE artist_id = 'WEST-ELIASSON-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://www.mplus.org.hk/en/collection/makers/lee-kit/' WHERE artist_id = 'HK-LEEKIT-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/David_Hockney' WHERE artist_id = 'WEST-HOCKNEY-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Zhang_Xiaogang' WHERE artist_id = 'CN-ZHANGXG-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Piet_Mondrian' WHERE artist_id = 'WEST-MONDRIAN-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Wucius_Wong' WHERE artist_id = 'HK-WUCIUS-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Alberto_Giacometti' WHERE artist_id = 'WEST-GIACO-01' AND (source_url IS NULL OR source_url = '');
UPDATE public.artists SET source_url = 'https://en.wikipedia.org/wiki/Bruno_Catalano' WHERE artist_id = 'INTL-CATALANO-01' AND (source_url IS NULL OR source_url = '');

INSERT INTO public.artists (artist_id, name_zh_en, culture_group, sba_theme_tags, formal_traits, dse_concept, spld_summary, origin, source_url)
VALUES
('CN-GAOJF-01','高劍父 (Gao Jianfu)','CN_HK',ARRAY['折衷中西','新國畫','時代題材'],'日本畫渲染、西方透視光影、水墨筆法','嶺南畫派創始人之一，主張折衷中西，把現代事物引入國畫','嶺南畫派創辦人之一。將中西畫法夾埋，畫埋現代嘢','水墨設色','https://en.wikipedia.org/wiki/Gao_Jianfu'),
('CN-GAOQF-01','高奇峰 (Gao Qifeng)','CN_HK',ARRAY['翎毛走獸','寫實','氣勢'],'寫實動物造型、撞水撞粉、強烈動勢','「嶺南三傑」之一，以寫實而有力的禽鳥走獸見稱','「嶺南三傑」之一。畫鷹同獅子呢類動物，好有氣勢','水墨設色','https://en.wikipedia.org/wiki/Gao_Qifeng'),
('CN-CHENSR-01','陳樹人 (Chen Shuren)','CN_HK',ARRAY['寫生','詩意','嶺南風景'],'清新淡雅設色、寫生構圖、簡潔筆墨','「嶺南三傑」之一，以清新自然的寫生營造詩意','「嶺南三傑」之一。畫風清新自然，好有詩意','水墨設色','https://en.wikipedia.org/wiki/Chen_Shuren'),
('HK-CHAOSA-01','趙少昂 (Chao Shao-an)','CN_HK',ARRAY['花鳥','草蟲','筆墨'],'精煉筆墨、光影與透視、靈動花鳥草蟲','嶺南畫派第二代大師，在香港授徒，以花鳥畫著稱','嶺南畫派第二代大師，喺香港教畫。最出名畫花鳥草蟲','水墨設色','https://en.wikipedia.org/wiki/Chao_Shao-an'),
('CN-GUANSY-01','關山月 (Guan Shanyue)','CN_HK',ARRAY['山水','寫生','梅花'],'寫生山水、宏大構圖、濃重設色','高劍父弟子、嶺南第二代代表，與傅抱石合繪《江山如此多嬌》','高劍父嘅學生。畫好大幅嘅山水，又好鍾意畫梅花','水墨設色','https://zh.wikipedia.org/wiki/%E5%85%B3%E5%B1%B1%E6%9C%88_(%E7%94%BB%E5%AE%B6)'),
('HK-YANGSS-01','楊善深 (Yang Shen-sum)','CN_HK',ARRAY['動物','花鳥','筆墨'],'流暢自然筆墨、細膩渲染設色','嶺南第二代畫家，長居香港，筆墨流暢、設色細膩','嶺南第二代畫家，住喺香港。筆法流暢，顏色細緻','水墨設色','https://zh.wikipedia.org/wiki/%E6%9D%A8%E5%96%84%E6%B7%B1'),
('HK-AUHN-01','歐豪年 (Au Ho-nien)','CN_HK',ARRAY['寫生','山水','動物'],'寫生為本、濃烈色彩、筆墨結合抽象感','趙少昂弟子，重視寫生，結合現代抽象感，影響台灣水墨','趙少昂嘅學生。好重視寫生，畫山水同動物，色彩濃','水墨設色','https://en.wikipedia.org/wiki/Au_Ho-nien'),
('HK-FANGZL-01','方召麐 (Fang Zhaoling)','CN_HK',ARRAY['書法性','稚拙','山水'],'粗獷書法線條、稚拙造型、大氣構圖','香港女性水墨畫家，以書法筆勢融合稚拙趣味，氣勢磅礴','香港女畫家。線條好似寫書法咁粗，又有童真','水墨／書法','https://en.wikipedia.org/wiki/Fang_Zhaoling'),
('HK-CHOWCF-01','周俊輝 (Chow Chun Fai)','HK_Local',ARRAY['電影','香港身份','社會現實'],'重畫電影定格、保留字幕、寫實油彩','重繪港產片畫面與字幕，探討香港身份和社會現實','香港畫家。將港產片畫面連字幕畫出嚟，講香港身份','油畫','https://en.wikipedia.org/wiki/Chow_Chun_Fai'),
('HK-LAMTP-01','林東鵬 (Lam Tung Pang)','HK_Local',ARRAY['集體記憶','自然','物料'],'夾板作畫、炭筆與塑膠彩、傳統山水構圖','在木夾板上作畫，探討集體記憶與自然的關係','香港藝術家。喺木夾板上面畫畫，講集體回憶同大自然','混合媒介（夾板）','https://en.wikipedia.org/wiki/Lam_Tung_Pang'),
('HK-TSANGKW-01','曾建華 (Tsang Kin-Wah)','HK_Local',ARRAY['文字','宗教','存在'],'文字組成花紋、沉浸式投影、動態文字','把文字化成裝飾花紋，遠看美麗、近看內容尖銳，討論宗教與存在','香港藝術家。用文字砌成花紋，遠睇靚，近睇先知講乜','裝置／錄像投影','https://en.wikipedia.org/wiki/Tsang_Kin-Wah'),
('HK-TANGKH-01','鄧國騫 (Tang Kwok Hin)','HK_Local',ARRAY['家庭','社會空間','現成物'],'現成物拼貼、日常物料、空間裝置','以現成物拼貼反思家庭與社會空間的連繫','香港藝術家。用現成物拼貼，講屋企同社會嘅關係','拼貼／混合媒介','https://en.wikipedia.org/wiki/Tang_Kwok_Hin'),
('HK-YOUNG-01','楊嘉輝 (Samson Young)','HK_Local',ARRAY['聲音','歷史','政治'],'聲音景觀、表演錄像、圖像樂譜','聲音藝術家，透過聲音景觀探討政治和歷史','香港聲音藝術家。用聲音講歷史同政治','聲音／裝置／表演','https://en.wikipedia.org/wiki/Samson_Young'),
('HK-LEUNG-01','梁嘉賢 (Joey Leung Ka-yin)','HK_Local',ARRAY['超現實','個人世界','幽默'],'細緻線條、配合幽默文字、超現實場景','以細膩線條和幽默文字勾勒超現實的個人世界','香港藝術家。用好幼嘅線同搞笑文字，畫出奇幻世界','繪畫（細線／設色）','https://www.mplus.org.hk/en/collection/makers/joey-leung-ka-yin/'),
('CN-YUEMJ-01','岳敏君 (Yue Minjun)','Chinese_Contemporary',ARRAY['玩世現實主義','笑臉','諷刺'],'重複大笑自我形象、鮮艷平塗、誇張表情','以標誌性大笑臉諷刺現代精神狀態','中國畫家。畫好多個大笑嘅自己，笑得好假','油畫','https://en.wikipedia.org/wiki/Yue_Minjun'),
('CN-FANGLJ-01','方力鈞 (Fang Lijun)','Chinese_Contemporary',ARRAY['玩世現實主義','光頭','時代失落'],'光頭人物、打呵欠表情、藍天水面背景','以光頭人物表現一個時代的無聊與失落','中國畫家。畫光頭人，表現一代人好無聊、好迷失','油畫','https://en.wikipedia.org/wiki/Fang_Lijun'),
('CN-LUOZL-01','羅中立 (Luo Zhongli)','Chinese_Contemporary',ARRAY['農民','超寫實','尺度'],'巨幅頭像、細緻皺紋皮膚、照相式寫實','《父親》以巨幅超寫實描繪農民，開創鄉土寫實','中國畫家。《父親》將一個農民畫到好大好真','油畫','https://en.wikipedia.org/wiki/Luo_Zhongli'),
('CN-XUBING-01','徐冰 (Xu Bing)','Chinese_Contemporary',ARRAY['語言','文字','文化'],'自創偽漢字、木刻活字、英文方塊字','《天書》等作品以造字質疑語言與文化的意義','中國藝術家。《天書》嘅字全部係自己作，冇人識讀','版畫／裝置','https://en.wikipedia.org/wiki/Xu_Bing'),
('CN-ZHANGPL-01','張培力 (Zhang Peili)','Chinese_Contemporary',ARRAY['錄像','重複','監視'],'長鏡頭、單一動作重複、冷靜觀察','被譽為中國錄像藝術之父，以重複與監視探討日常','中國錄像藝術之父。重複拍同一個動作，好似監視咁','錄像／裝置','https://en.wikipedia.org/wiki/Zhang_Peili_(artist)'),
('CN-YANGFD-01','楊福東 (Yang Fudong)','Chinese_Contemporary',ARRAY['電影感','都市青年','迷惘'],'黑白菲林、緩慢敘事、多屏放映','以電影質感和頹廢美學描繪知識青年的迷惘','中國錄像藝術家。黑白片好似舊電影，講年輕人迷惘','錄像／電影','https://en.wikipedia.org/wiki/Yang_Fudong'),
('CN-QIUZJ-01','邱志杰 (Qiu Zhijie)','Chinese_Contemporary',ARRAY['書寫','地圖','歷史'],'重複書寫、手繪觀念地圖、文字與圖像結合','以「觀念地圖」把複雜的歷史與哲學視覺化','中國藝術家。畫「觀念地圖」，將歷史同哲學畫成地圖','書法／裝置／地圖','https://en.wikipedia.org/wiki/Qiu_Zhijie'),
('CN-WUSZ-01','吳山專 (Wu Shanzhuan)','Chinese_Contemporary',ARRAY['文字','荒誕','體制'],'大字標語式文字、荒誕行為、商業符號挪用','以文字和荒誕行動挑戰體制與邏輯','中國藝術家。用一堆文字同古怪行為，挑戰規矩','文字裝置／行為','https://en.wikipedia.org/wiki/Wu_Shanzhuan'),
('CN-CAIGQ-01','蔡國強 (Cai Guo-Qiang)','Chinese_Contemporary',ARRAY['火藥','爆破','宇宙'],'火藥爆破燒痕、大型戶外爆破事件、偶然效果','以火藥為媒材，探討能量、爆炸與宇宙','中國藝術家。用火藥爆出畫面，又做大型煙花','火藥／裝置','https://en.wikipedia.org/wiki/Cai_Guo-Qiang'),
('CN-HUANGYP-01','黃永砅 (Huang Yong Ping)','Chinese_Contemporary',ARRAY['前衛','動物','文化批判'],'活昆蟲與動物、宗教符號、大型裝置','廈門達達創辦人，以昆蟲動物與宗教符號作文化批判','中國前衛藝術家。用真昆蟲同動物做裝置，諷刺文化衝突','裝置','https://en.wikipedia.org/wiki/Huang_Yong_Ping'),
('CN-GUWD-01','谷文達 (Gu Wenda)','Chinese_Contemporary',ARRAY['人髮','種族','文化融合'],'收集各國人髮、髮簾與偽文字、巨型裝置','以人髮製作巨型裝置，探討種族與文化融合','中國藝術家。收集世界各地人嘅頭髮，做成巨型裝置','裝置（人髮）','https://en.wikipedia.org/wiki/Gu_Wenda'),
('CN-ZHANGH-01','張洹 (Zhang Huan)','Chinese_Contemporary',ARRAY['身體','忍耐','生命'],'裸身承受極端環境、攝影記錄、香灰材料','以挑戰身體極限的行為探討生命本質','中國行為藝術家。用自己身體頂住好辛苦嘅環境','行為／攝影','https://en.wikipedia.org/wiki/Zhang_Huan'),
('CN-LIUXD-01','劉小東 (Liu Xiaodong)','Chinese_Contemporary',ARRAY['新生代寫實','小人物','現場寫生'],'現場寫生、大幅群像、率直筆觸','新生代寫實代表，關注社會底層與普通生活的真實','中國畫家。去現場畫普通人，畫佢哋真實生活','油畫','https://en.wikipedia.org/wiki/Liu_Xiaodong'),
('CN-AIWW-01','艾未未 (Ai Weiwei)','Chinese_Contemporary',ARRAY['社會介入','政治批判','大量重複'],'大量手工複製物、現成物改造、紀錄影像','以藝術作為社會介入與政治批判的工具','中國藝術家。用藝術講社會同批評政治','裝置／觀念','https://en.wikipedia.org/wiki/Ai_Weiwei'),
('CN-CAOFEI-01','曹斐 (Cao Fei)','Chinese_Contemporary',ARRAY['虛擬世界','都市青年','異化'],'虛擬遊戲世界、角色扮演、紀實錄像','以《人民城寨》等虛擬世界探討都市青年的異化','中國藝術家。喺網上虛擬世界起城市，講年輕人','錄像／數碼媒體','https://en.wikipedia.org/wiki/Cao_Fei'),
('CN-ZENGFZ-01','曾梵志 (Zeng Fanzhi)','Chinese_Contemporary',ARRAY['面具','偽裝','疏離'],'白色面具人物、誇張大手、表現主義筆觸','《面具》系列表現現代人際關係中的偽裝與疏離','中國畫家。畫戴住白面具嘅人，講人同人之間扮嘢','油畫','https://en.wikipedia.org/wiki/Zeng_Fanzhi'),
('CN-SUIJG-01','隋建國 (Sui Jianguo)','Chinese_Contemporary',ARRAY['符號','中山裝','歷史'],'巨型中山裝、空殼形體、金屬鑄造','把中山裝等傳統符號重新組合成雕塑，反思歷史','中國雕塑家。整好大件冇人着嘅中山裝','雕塑','https://en.wikipedia.org/wiki/Sui_Jianguo'),
('CN-DINGYI-01','丁乙 (Ding Yi)','Chinese_Contemporary',ARRAY['極簡','十字','重複'],'「十」字與「×」重複網格、理性秩序、密集色點','數十年以「十示」系列表現工業節奏與理性','中國畫家。幾十年都係畫「十」字，好有規律','繪畫（抽象）','https://en.wikipedia.org/wiki/Ding_Yi_(artist)'),
('CN-WUGZ-01','吳冠中 (Wu Guanzhong)','Chinese_Contemporary',ARRAY['形式美','點線面','江南'],'水墨線條、彩點、黑白灰塊面','結合水墨線條與西方抽象色塊，提倡形式美','中國畫家。用線、點、黑白灰畫江南，講形式美','水墨／油畫','https://en.wikipedia.org/wiki/Wu_Guanzhong'),
('CN-XUBH-01','徐悲鴻 (Xu Beihong)','Chinese_Contemporary',ARRAY['寫實','解剖','民族精神'],'素描造型、準確解剖、奔馬墨韻','把西方解剖與素描引入國畫，以奔馬象徵民族精神','中國畫家。用西方素描方法畫馬，代表民族精神','水墨／油畫／素描','https://en.wikipedia.org/wiki/Xu_Beihong'),
('CN-CHUTC-01','朱德群 (Chu Teh-Chun)','Chinese_Contemporary',ARRAY['抒情抽象','書法','光'],'書法式筆觸、光影層次、濃淡色彩','融合書法筆勢與西方光影，發展抒情抽象','華裔抽象畫家。筆觸好似書法，又有光暗變化','油畫（抽象）','https://en.wikipedia.org/wiki/Chu_Teh-Chun'),
('CN-LINFM-01','林風眠 (Lin Fengmian)','Chinese_Contemporary',ARRAY['中西調和','方形構圖','民間'],'方形構圖、印象派色光、民間藝術造型','以方形構圖融合印象派與民間藝術，推動中西調和','中國畫家。用正方形畫面，夾埋西方印象派同民間藝術','彩墨','https://en.wikipedia.org/wiki/Lin_Fengmian'),
('CN-ZHANGDQ-01','張大千 (Zhang Daqian)','Chinese_Contemporary',ARRAY['潑墨潑彩','傳統','抽象'],'大面積潑墨潑彩、石青石綠、局部細筆','潑墨潑彩的高峰，由傳統跨向現代抽象','中國畫家。將墨同顏色潑上紙，變到好似抽象畫','水墨設色（潑墨潑彩）','https://en.wikipedia.org/wiki/Chang_Dai-chien'),
('CN-QIBS-01','齊白石 (Qi Baishi)','Chinese_Contemporary',ARRAY['稚拙','草蟲','生活趣味'],'簡練筆墨、紅花墨葉、大寫意配工筆草蟲','以童趣把蝦、蟲等卑微題材提升為高雅藝術','中國畫家。最出名畫蝦同草蟲，好簡單又好生動','水墨設色','https://en.wikipedia.org/wiki/Qi_Baishi'),
('CN-PANTS-01','潘天壽 (Pan Tianshou)','Chinese_Contemporary',ARRAY['構圖','霸悍筆力','平衡'],'方硬筆線、大塊奇石、造險破險構圖','強調雄強筆力和大膽構圖，以「造險破險」取得平衡','中國畫家。構圖好大膽，先整到險，再搵返平衡','水墨設色（指墨）','https://en.wikipedia.org/wiki/Pan_Tianshou'),
('CN-LITF-01','李鐵夫 (Li Tiefu)','Chinese_Contemporary',ARRAY['油畫先驅','古典寫實','人物'],'古典寫實油畫、厚實筆觸、深色調肖像','中國油畫先驅，深得古典寫實油畫技法','中國油畫先驅。好早去外國學油畫，畫得好寫實','油畫','https://en.wikipedia.org/wiki/Li_Tiefu'),
('CN-BIGTAIL-01','大尾象工作組 (Big Tail Elephants)','Chinese_Contemporary',ARRAY['城市化','另類空間','珠三角'],'臨時空間展覽、行為介入、即場裝置','1990年代廣州藝術團體，回應廣東急速城市化','九十年代廣州藝術家組合。喺酒吧、地庫做展覽，講城市變得好快','裝置／行為／錄像','https://en.wikipedia.org/wiki/Big_Tail_Elephant'),
('CN-WANGQS-01','王慶松 (Wang Qingsong)','Chinese_Contemporary',ARRAY['消費主義','擺拍','諷刺'],'大型佈景擺拍、群眾演員、鮮艷誇張畫面','以大型擺拍攝影批判當代消費主義','中國攝影師。砌好大場景再影相，諷刺消費主義','攝影（擺拍）','https://en.wikipedia.org/wiki/Wang_Qingsong'),
('CN-SONGDONG-01','宋冬 (Song Dong)','Chinese_Contemporary',ARRAY['物質','家族歷史','日常物'],'大量家用舊物排列、生活痕跡、紀錄性裝置','《物盡其用》展示母親數十年保存的舊物，探討物質與家族歷史','中國藝術家。將阿媽儲咗幾十年嘅舊嘢擺出嚟','裝置','https://en.wikipedia.org/wiki/Song_Dong'),
('CN-YINXZ-01','尹秀珍 (Yin Xiuzhen)','Chinese_Contemporary',ARRAY['舊衣','記憶','全球身份'],'舊衣物縫製、行李箱城市、軟雕塑','以舊衣物製作裝置，探討記憶與全球化身份','中國藝術家。用人哋着過嘅舊衫做裝置，講回憶','裝置（舊衣物）','https://en.wikipedia.org/wiki/Yin_Xiuzhen'),
('CN-CHENSX-01','陳劭雄 (Chen Shaoxiong)','Chinese_Contemporary',ARRAY['都市','荒誕','水墨動畫'],'水墨逐格動畫、街頭攝影拼貼、錄像','以錄像和水墨探討都市生活的荒誕','中國藝術家。用水墨畫做動畫，講城市生活好荒謬','錄像／水墨動畫','https://en.wikipedia.org/wiki/Chen_Shaoxiong'),
('CN-ZHANWANG-01','展望 (Zhan Wang)','Chinese_Contemporary',ARRAY['假山石','倒影','現代山水'],'不鏽鋼複製太湖石、鏡面反射、工業質感','以不鏽鋼「假山石」諷刺現代化下的山水觀','中國雕塑家。用不鏽鋼整假山石，閃閃發光','雕塑（不鏽鋼）','https://en.wikipedia.org/wiki/Zhan_Wang'),
('CN-SHENSM-01','沈少民 (Shen Shaomin)','Chinese_Contemporary',ARRAY['骨骼','生存','進化'],'動物骨頭組合虛構生物、標本式陳列、科技模擬','以骨頭或科技模擬探討生存與進化','中國藝術家。用骨頭砌出唔存在嘅動物','裝置／雕塑','https://en.wikipedia.org/wiki/Shen_Shaomin'),
('CN-WANGKP-01','王克平 (Wang Keping)','Chinese_Contemporary',ARRAY['人體','木材','社會壓抑'],'簡化人體、保留木紋木結、圓潤有機形體','「星星畫會」成員，以木雕表達人體與社會壓抑','中國雕塑家。用木頭雕人，保留木紋，好簡單','木雕','https://www.mplus.org.hk/en/collection/makers/wang-keping/'),
('CN-XUTAN-01','徐坦 (Xu Tan)','Chinese_Contemporary',ARRAY['關鍵詞','社會調查','語言'],'訪談錄像、關鍵詞文字、調查檔案','以社會調查探索關鍵詞與公眾心理','中國藝術家。訪問好多人，搵出社會常用嘅關鍵詞','社會調查／錄像／文字','https://www.mplus.org.hk/en/collection/makers/xu-tan/'),
('WEST-LEONARDO-01','列奧納多·達文西 (Leonardo da Vinci)','Western',ARRAY['觀察','解剖','文藝復興'],'暈塗法、精準解剖素描、金字塔式構圖','文藝復興巨匠，以理性觀察和解剖研究達致寫實高峰','意大利文藝復興大師。畫《蒙娜麗莎》，好識解剖','油畫／素描','https://en.wikipedia.org/wiki/Leonardo_da_Vinci'),
('WEST-CARAVAGGIO-01','卡拉瓦喬 (Caravaggio)','Western',ARRAY['明暗對照','戲劇性','平民'],'強烈明暗對比、暗背景、以平民作模特兒','明暗對照法先驅，以戲劇光影和平民形象描繪宗教題材','意大利巴洛克畫家。光暗好強烈，好似舞台燈','油畫','https://en.wikipedia.org/wiki/Caravaggio'),
('WEST-MONET-01','克勞德·莫奈 (Claude Monet)','Western',ARRAY['印象派','光','戶外寫生'],'短碎筆觸、戶外寫生、同一景物系列','印象派代表，捕捉瞬間光色變化','法國印象派畫家。喺戶外畫同一個景，捕捉光嘅變化','油畫','https://en.wikipedia.org/wiki/Claude_Monet'),
('WEST-PICASSO-01','巴勃羅·畢加索 (Pablo Picasso)','Western',ARRAY['立體主義','多視點','變形'],'幾何拆解、多角度同時呈現、拼貼','立體主義創始人之一，解構空間與透視','西班牙畫家。立體主義，將一樣嘢由幾個角度同時畫出嚟','油畫／雕塑／拼貼','https://en.wikipedia.org/wiki/Pablo_Picasso'),
('WEST-MATISSE-01','亨利·馬蒂斯 (Henri Matisse)','Western',ARRAY['野獸派','色彩','簡化'],'大膽平塗色彩、簡化輪廓、晚年剪紙','野獸派領袖，以大膽色彩和簡化剪紙表達','法國畫家。顏色好大膽，晚年用剪紙創作','油畫／剪紙','https://en.wikipedia.org/wiki/Henri_Matisse'),
('WEST-DALI-01','薩爾瓦多·達利 (Salvador Dalí)','Western',ARRAY['超現實','夢境','潛意識'],'精細寫實技法、溶化變形物件、荒漠夢境空間','超現實主義代表，把夢境與潛意識視覺化','西班牙超現實畫家。畫溶化咗嘅時鐘，好似發夢','油畫','https://en.wikipedia.org/wiki/Salvador_Dal%C3%AD'),
('WEST-KANDINSKY-01','瓦西里·康丁斯基 (Wassily Kandinsky)','Western',ARRAY['抽象','色彩音樂','點線面'],'點、線、面組合、色彩韻律、非具象構圖','抽象藝術先驅，視色彩如音樂共鳴','俄國抽象畫家。覺得顏色好似音樂，用點線面作畫','油畫','https://en.wikipedia.org/wiki/Wassily_Kandinsky'),
('WEST-OKEEFFE-01','喬治亞·奧基芙 (Georgia O''Keeffe)','Western',ARRAY['花卉','放大','沙漠'],'巨大特寫花卉、柔和漸變、簡化形體','以放大花卉和沙漠風景探索女性意識','美國女畫家。將花畫到好大好近，又畫沙漠','油畫','https://en.wikipedia.org/wiki/Georgia_O%27Keeffe'),
('WEST-MOORE-01','亨利·摩爾 (Henry Moore)','Western',ARRAY['有機形體','鏤空','斜臥人像'],'圓潤有機形體、穿孔鏤空、斜臥人像','以有機形體和鏤空空間發展抽象雕塑','英國雕塑家。雕好圓滑嘅人形，中間有窿','雕塑','https://en.wikipedia.org/wiki/Henry_Moore'),
('WEST-BACON-01','法蘭西斯·培根 (Francis Bacon)','Western',ARRAY['扭曲人像','焦慮','存在'],'扭曲模糊人像、籠狀空間框架、強烈色面背景','以扭曲人像表現戰後存在焦慮','英國畫家。人像扭曲變形，好似好痛苦','油畫','https://en.wikipedia.org/wiki/Francis_Bacon_(artist)'),
('WEST-POLLOCK-01','傑克遜·波洛克 (Jackson Pollock)','Western',ARRAY['行動繪畫','偶然','身體動作'],'地上畫布滴灑顏料、滿幅構圖、線條交織','行動繪畫代表，以身體動作留下偶然之美','美國畫家。將畫布放地下，滴同灑顏料','油彩／瓷漆（滴畫）','https://en.wikipedia.org/wiki/Jackson_Pollock'),
('WEST-DUCHAMP-01','馬塞爾·杜尚 (Marcel Duchamp)','Western',ARRAY['現成物','觀念','重新定義藝術'],'選取日常製品、簽名改題、去手工化','「現成物」創始人，以《噴泉》重新定義藝術','法國藝術家。將一個尿兜簽名當藝術品，改變咗咩係藝術','現成物／觀念','https://en.wikipedia.org/wiki/Marcel_Duchamp'),
('INTL-BANKSY-01','班克斯 (Banksy)','International',ARRAY['街頭','諷刺','政治'],'模板噴漆、黑色幽默、公共牆面','匿名街頭藝術家，以塗鴉作社會與政治諷刺','英國匿名街頭藝術家。喺牆上噴畫，諷刺社會','街頭藝術（模板噴漆）','https://en.wikipedia.org/wiki/Banksy'),
('INTL-KUSAMA-01','草間彌生 (Yayoi Kusama)','International',ARRAY['圓點','重複','自我消融'],'無限圓點、鏡屋無限反射、網紋重複','「圓點女王」，以重複探索自我消融','日本藝術家。周圍都係圓點，又整無限鏡屋','裝置／繪畫','https://en.wikipedia.org/wiki/Yayoi_Kusama'),
('INTL-SHERMAN-01','辛迪·舍曼 (Cindy Sherman)','International',ARRAY['角色扮演','女性形象','媒體'],'自拍扮演、電影劇照風格、化妝佈景','以角色扮演批判媒體中的女性定型，如《無題電影劇照》','美國攝影師。自己扮唔同角色影相，講媒體點睇女性','攝影','https://en.wikipedia.org/wiki/Cindy_Sherman'),
('INTL-VIOLA-01','比爾·維奧拉 (Bill Viola)','International',ARRAY['生死','信仰','慢鏡'],'極慢鏡頭、水與火元素、大型投影','錄像藝術大師，探索生死與信仰','美國錄像藝術家。用好慢嘅鏡頭講生同死','錄像裝置','https://en.wikipedia.org/wiki/Bill_Viola'),
('INTL-ABRAMOVIC-01','瑪莉娜·阿布拉莫維奇 (Marina Abramović)','International',ARRAY['身體','忍耐','觀眾'],'長時間行為、身體極限、與觀眾直接互動','行為藝術先驅，探索人體極限與忍耐','塞爾維亞行為藝術家。用自己身體挑戰極限','行為藝術','https://en.wikipedia.org/wiki/Marina_Abramovi%C4%87'),
('INTL-KAPOOR-01','安尼施·卡普爾 (Anish Kapoor)','International',ARRAY['反射','空間','虛空'],'鏡面不鏽鋼、深色虛空凹面、巨大尺度','以巨型雕塑探索反射、空間與虛空，如芝加哥《雲門》','英國印度裔雕塑家。巨型鏡面雕塑，照到周圍','雕塑／裝置','https://en.wikipedia.org/wiki/Anish_Kapoor'),
('INTL-WALKER-01','卡拉·沃克 (Kara Walker)','International',ARRAY['種族','歷史','暴力'],'黑色剪紙剪影、整室環繞敘事、強烈黑白對比','以剪影探討種族暴力與歷史','美國藝術家。用黑色剪紙剪影講種族歷史','剪影／裝置','https://en.wikipedia.org/wiki/Kara_Walker'),
('INTL-MURAKAMI-01','村上隆 (Takashi Murakami)','International',ARRAY['超扁平','次文化','高低藝術'],'動漫式平面色彩、可愛角色、商業合作','提出「超扁平」，模糊高雅藝術與次文化的界線','日本藝術家。好似動漫咁平面同可愛，又同品牌合作','繪畫／雕塑／商品','https://en.wikipedia.org/wiki/Takashi_Murakami'),
('INTL-KOONS-01','傑夫·昆斯 (Jeff Koons)','International',ARRAY['消費','媚俗','放大'],'鏡面不鏽鋼、放大日常物件、工廠式製作','把大眾消費品化為昂貴雕塑，如不鏽鋼氣球狗','美國藝術家。將氣球狗整成好大好閃嘅雕塑','雕塑','https://en.wikipedia.org/wiki/Jeff_Koons'),
('INTL-HIRST-01','達米恩·赫斯特 (Damien Hirst)','International',ARRAY['生死','標本','商業'],'甲醛浸泡動物、藥櫃陳列、整齊點畫','以生物標本挑戰生命、死亡與商業的關係','英國藝術家。將動物浸喺藥水入面展覽，講生死','裝置／雕塑','https://en.wikipedia.org/wiki/Damien_Hirst'),
('INTL-CALDER-01','亞歷山大·考爾德 (Alexander Calder)','International',ARRAY['動態','平衡','重力'],'懸吊金屬片、空氣推動、原色平面','「動態雕塑」發明者，探討重力與平衡','美國雕塑家。整會郁嘅吊飾雕塑，講平衡','動態雕塑','https://en.wikipedia.org/wiki/Alexander_Calder'),
('INTL-MUECK-01','朗·穆克 (Ron Mueck)','International',ARRAY['超寫實','尺度','心理'],'矽膠樹脂逼真皮膚毛髮、刻意放大或縮小','以超寫實人像和尺度變化製造心理張力','澳洲雕塑家。人像好似真人，但係特登整到好大或者好細','雕塑（超寫實）','https://en.wikipedia.org/wiki/Ron_Mueck'),
('INTL-ANDO-01','安藤忠雄 (Tadao Ando)','International',ARRAY['清水混凝土','光','自然'],'清水混凝土、幾何空間、引入自然光','以清水混凝土和光營造禪意空間，如「光之教堂」','日本建築師。用石屎同光，起好靜嘅空間','建築','https://en.wikipedia.org/wiki/Tadao_Ando'),
('INTL-KRUGER-01','芭芭拉·克魯格 (Barbara Kruger)','International',ARRAY['標語','權力','消費主義'],'黑白照片、紅底白字標語、直接稱呼觀眾','以圖像與標語批判權力與消費主義','美國藝術家。黑白相加紅底白字標語，批評消費','攝影拼貼／文字','https://en.wikipedia.org/wiki/Barbara_Kruger'),
('INTL-EMIN-01','翠西·艾敏 (Tracey Emin)','International',ARRAY['自傳','私密','創傷'],'真實私人物品、手寫霓虹字、縫綴布料','以自傳式作品展示私隱與創傷，如《我的床》','英國藝術家。將自己張床同私人物品展出，講心事','裝置／霓虹／刺繡','https://en.wikipedia.org/wiki/Tracey_Emin'),
('INTL-PICCININI-01','派翠西亞·比奇尼尼 (Patricia Piccinini)','International',ARRAY['生物科技','混種','倫理'],'逼真矽膠混種生物、人類毛髮、溫柔姿態','以混種生物模型探討生物工程與倫理','澳洲藝術家。整半人半動物嘅怪生物，講科技倫理','雕塑（矽膠）','https://en.wikipedia.org/wiki/Patricia_Piccinini'),
('INTL-CHRISTO-01','克里斯托與珍妮-克勞德 (Christo and Jeanne-Claude)','International',ARRAY['包裹','地景','短暫'],'巨型布料包裹建築與地景、臨時展示','以布料「包裹」地標作大地藝術，如包裹德國國會大廈','藝術家夫婦。用好大塊布包住成座建築物','大地藝術／裝置','https://en.wikipedia.org/wiki/Christo_and_Jeanne-Claude'),
('INTL-ERLICH-01','林德羅·埃利希 (Leandro Erlich)','International',ARRAY['錯覺','感知','建築'],'鏡面反射錯覺、日常建築場景、觀眾參與','以視覺錯覺裝置挑戰感知','阿根廷藝術家。用鏡同建築做錯覺，觀眾可以入去玩','錯覺裝置','https://en.wikipedia.org/wiki/Leandro_Erlich'),
('INTL-BICKERTON-01','艾殊利·比克頓 (Ashley Bickerton)','International',ARRAY['異化','自然','科技'],'工業物料組合、商標符號、攝影與繪畫結合','探討人、自然與科技之間的異化','美國藝術家。用工業材料同商標，講人同自然疏離','混合媒介','https://en.wikipedia.org/wiki/Ashley_Bickerton')
ON CONFLICT (artist_id) DO NOTHING;

INSERT INTO public.artist_pairs (id, theme, medium, west_artist_id, east_artist_id)
VALUES
('PAIR-REALISM-01','寫實觀察與解剖','油畫素描 / 水墨素描','WEST-LEONARDO-01','CN-XUBH-01'),
('PAIR-REALISM-02','平民寫實與現場真實','油畫','WEST-CARAVAGGIO-01','CN-LIUXD-01'),
('PAIR-IMPRESS-01','印象色光與中西調和','油畫 / 彩墨','WEST-MONET-01','CN-LINFM-01'),
('PAIR-BREAK-01','突破傳統','油畫 / 潑墨潑彩','WEST-PICASSO-01','CN-ZHANGDQ-01'),
('PAIR-SIMPLE-01','簡化與童趣','油畫剪紙 / 水墨設色','WEST-MATISSE-01','CN-QIBS-01'),
('PAIR-DREAM-01','夢境與超現實','油畫 / 細線繪畫','WEST-DALI-01','HK-LEUNG-01'),
('PAIR-FORM-01','點線面與形式美','油畫 / 水墨','WEST-KANDINSKY-01','CN-WUGZ-01'),
('PAIR-FLOWER-01','花卉的觀看','油畫 / 水墨設色','WEST-OKEEFFE-01','HK-CHAOSA-01'),
('PAIR-CARVE-01','有機形體與雕刻','雕塑','WEST-MOORE-01','CN-WANGKP-01'),
('PAIR-ANXIETY-01','焦慮與表現性人像','油畫','WEST-BACON-01','CN-ZENGFZ-01'),
('PAIR-GESTURE-01','身體動作與書法筆勢','油畫抽象','WEST-POLLOCK-01','CN-CHUTC-01'),
('PAIR-CONCEPT-01','觀念與重新定義','現成物 / 版畫裝置','WEST-DUCHAMP-01','CN-XUBING-01'),
('PAIR-PROTEST-01','藝術作為社會批判','街頭藝術 / 裝置','INTL-BANKSY-01','CN-AIWW-01'),
('PAIR-REPEAT-01','重複圖案','裝置 / 抽象繪畫','INTL-KUSAMA-01','CN-DINGYI-01'),
('PAIR-FILM-01','電影影像與身份','攝影 / 油畫','INTL-SHERMAN-01','HK-CHOWCF-01'),
('PAIR-VIDEO-01','錄像與時間','錄像','INTL-VIOLA-01','CN-YANGFD-01'),
('PAIR-ENDURE-01','身體與忍耐','行為藝術','INTL-ABRAMOVIC-01','CN-ZHANGH-01'),
('PAIR-MIRROR-01','鏡面不鏽鋼與倒影','雕塑（不鏽鋼）','INTL-KAPOOR-01','CN-ZHANWANG-01'),
('PAIR-RACE-01','種族與歷史','剪影 / 人髮裝置','INTL-WALKER-01','CN-GUWD-01'),
('PAIR-SUBCULTURE-01','次文化與虛擬世界','繪畫雕塑 / 數碼媒體','INTL-MURAKAMI-01','CN-CAOFEI-01'),
('PAIR-ICON-01','符號與雕塑','雕塑','INTL-KOONS-01','CN-SUIJG-01'),
('PAIR-LIFEDEATH-01','生死與標本','裝置／雕塑','INTL-HIRST-01','CN-SHENSM-01'),
('PAIR-BALANCE-01','平衡與張力','動態雕塑 / 水墨','INTL-CALDER-01','CN-PANTS-01'),
('PAIR-SCALE-01','超寫實與尺度','雕塑 / 油畫','INTL-MUECK-01','CN-LUOZL-01'),
('PAIR-NATURE-01','自然、物料與空間','建築 / 夾板繪畫','INTL-ANDO-01','HK-LAMTP-01'),
('PAIR-CONSUMER-02','消費主義批判','攝影拼貼 / 擺拍攝影','INTL-KRUGER-01','CN-WANGQS-01'),
('PAIR-PRIVATE-01','私人物件與自傳','裝置','INTL-EMIN-01','CN-SONGDONG-01'),
('PAIR-CREATURE-01','生物、倫理與文化','雕塑 / 裝置','INTL-PICCININI-01','CN-HUANGYP-01'),
('PAIR-LANDART-01','大型短暫事件','大地藝術 / 火藥','INTL-CHRISTO-01','CN-CAIGQ-01'),
('PAIR-ILLUSION-01','錯覺與觀看','錯覺裝置 / 文字投影','INTL-ERLICH-01','HK-TSANGKW-01'),
('PAIR-URBAN-02','人、自然與城市異化','混合媒介 / 裝置行為','INTL-BICKERTON-01','CN-BIGTAIL-01'),
('PAIR-FUSION-01','中西融合的兩條路','油畫 / 水墨設色','CN-LITF-01','CN-GAOJF-01'),
('PAIR-ANIMAL-01','嶺南翎毛走獸','水墨設色','CN-GAOQF-01','HK-YANGSS-01'),
('PAIR-LANDSCAPE-01','嶺南山水寫生','水墨設色','CN-CHENSR-01','CN-GUANSY-01'),
('PAIR-INKHK-01','香港水墨的個人面貌','水墨設色','HK-AUHN-01','HK-FANGZL-01'),
('PAIR-CYNICAL-01','玩世現實主義','油畫','CN-YUEMJ-01','CN-FANGLJ-01'),
('PAIR-MEDIA-01','錄像與聲音媒介','錄像 / 聲音裝置','CN-ZHANGPL-01','HK-YOUNG-01'),
('PAIR-URBAN-03','珠三角都市','錄像 / 社會調查','CN-CHENSX-01','CN-XUTAN-01'),
('PAIR-TEXT-01','文字與觀念','文字裝置 / 書法','CN-WUSZ-01','CN-QIUZJ-01'),
('PAIR-MEMORY-01','舊物與家庭記憶','裝置 / 拼貼','CN-YINXZ-01','HK-TANGKH-01')
ON CONFLICT (id) DO NOTHING;

UPDATE public.artists SET name_zh_hans = '爱德华·霍普' WHERE artist_id = 'WEST-HOPPER-01';
UPDATE public.artists SET name_zh_hans = '白双全' WHERE artist_id = 'HK-PAK-01';
UPDATE public.artists SET name_zh_hans = '文森特·梵高' WHERE artist_id = 'WEST-VANGOGH-01';
UPDATE public.artists SET name_zh_hans = '吕寿琨' WHERE artist_id = 'CN-LV-01';
UPDATE public.artists SET name_zh_hans = '马克·罗斯科' WHERE artist_id = 'WEST-ROTHKO-01';
UPDATE public.artists SET name_zh_hans = '赵无极' WHERE artist_id = 'CN-ZAO-01';
UPDATE public.artists SET name_zh_hans = '安迪·沃霍尔' WHERE artist_id = 'WEST-WARHOL-01';
UPDATE public.artists SET name_zh_hans = '王广义' WHERE artist_id = 'CN-WANGGY-01';
UPDATE public.artists SET name_zh_hans = '弗里达·卡罗' WHERE artist_id = 'WEST-KAHLO-01';
UPDATE public.artists SET name_zh_hans = '石家豪' WHERE artist_id = 'HK-SHIEH-01';
UPDATE public.artists SET name_zh_hans = '勒内·马格利特' WHERE artist_id = 'WEST-MAGRITTE-01';
UPDATE public.artists SET name_zh_hans = '陈福善' WHERE artist_id = 'HK-LUISCHAN-01';
UPDATE public.artists SET name_zh_hans = '奥拉维尔·埃利亚松' WHERE artist_id = 'WEST-ELIASSON-01';
UPDATE public.artists SET name_zh_hans = '李杰' WHERE artist_id = 'HK-LEEKIT-01';
UPDATE public.artists SET name_zh_hans = '大卫·霍克尼' WHERE artist_id = 'WEST-HOCKNEY-01';
UPDATE public.artists SET name_zh_hans = '张晓刚' WHERE artist_id = 'CN-ZHANGXG-01';
UPDATE public.artists SET name_zh_hans = '皮特·蒙德里安' WHERE artist_id = 'WEST-MONDRIAN-01';
UPDATE public.artists SET name_zh_hans = '王无邪' WHERE artist_id = 'HK-WUCIUS-01';
UPDATE public.artists SET name_zh_hans = '阿尔贝托·贾科梅蒂' WHERE artist_id = 'WEST-GIACO-01';
UPDATE public.artists SET name_zh_hans = '布鲁诺·卡塔拉诺' WHERE artist_id = 'INTL-CATALANO-01';
UPDATE public.artists SET name_zh_hans = '高剑父' WHERE artist_id = 'CN-GAOJF-01';
UPDATE public.artists SET name_zh_hans = '高奇峰' WHERE artist_id = 'CN-GAOQF-01';
UPDATE public.artists SET name_zh_hans = '陈树人' WHERE artist_id = 'CN-CHENSR-01';
UPDATE public.artists SET name_zh_hans = '赵少昂' WHERE artist_id = 'HK-CHAOSA-01';
UPDATE public.artists SET name_zh_hans = '关山月' WHERE artist_id = 'CN-GUANSY-01';
UPDATE public.artists SET name_zh_hans = '杨善深' WHERE artist_id = 'HK-YANGSS-01';
UPDATE public.artists SET name_zh_hans = '欧豪年' WHERE artist_id = 'HK-AUHN-01';
UPDATE public.artists SET name_zh_hans = '方召麐' WHERE artist_id = 'HK-FANGZL-01';
UPDATE public.artists SET name_zh_hans = '周俊辉' WHERE artist_id = 'HK-CHOWCF-01';
UPDATE public.artists SET name_zh_hans = '林东鹏' WHERE artist_id = 'HK-LAMTP-01';
UPDATE public.artists SET name_zh_hans = '曾建华' WHERE artist_id = 'HK-TSANGKW-01';
UPDATE public.artists SET name_zh_hans = '邓国骞' WHERE artist_id = 'HK-TANGKH-01';
UPDATE public.artists SET name_zh_hans = '杨嘉辉' WHERE artist_id = 'HK-YOUNG-01';
UPDATE public.artists SET name_zh_hans = '梁嘉贤' WHERE artist_id = 'HK-LEUNG-01';
UPDATE public.artists SET name_zh_hans = '岳敏君' WHERE artist_id = 'CN-YUEMJ-01';
UPDATE public.artists SET name_zh_hans = '方力钧' WHERE artist_id = 'CN-FANGLJ-01';
UPDATE public.artists SET name_zh_hans = '罗中立' WHERE artist_id = 'CN-LUOZL-01';
UPDATE public.artists SET name_zh_hans = '徐冰' WHERE artist_id = 'CN-XUBING-01';
UPDATE public.artists SET name_zh_hans = '张培力' WHERE artist_id = 'CN-ZHANGPL-01';
UPDATE public.artists SET name_zh_hans = '杨福东' WHERE artist_id = 'CN-YANGFD-01';
UPDATE public.artists SET name_zh_hans = '邱志杰' WHERE artist_id = 'CN-QIUZJ-01';
UPDATE public.artists SET name_zh_hans = '吴山专' WHERE artist_id = 'CN-WUSZ-01';
UPDATE public.artists SET name_zh_hans = '蔡国强' WHERE artist_id = 'CN-CAIGQ-01';
UPDATE public.artists SET name_zh_hans = '黄永砅' WHERE artist_id = 'CN-HUANGYP-01';
UPDATE public.artists SET name_zh_hans = '谷文达' WHERE artist_id = 'CN-GUWD-01';
UPDATE public.artists SET name_zh_hans = '张洹' WHERE artist_id = 'CN-ZHANGH-01';
UPDATE public.artists SET name_zh_hans = '刘小东' WHERE artist_id = 'CN-LIUXD-01';
UPDATE public.artists SET name_zh_hans = '艾未未' WHERE artist_id = 'CN-AIWW-01';
UPDATE public.artists SET name_zh_hans = '曹斐' WHERE artist_id = 'CN-CAOFEI-01';
UPDATE public.artists SET name_zh_hans = '曾梵志' WHERE artist_id = 'CN-ZENGFZ-01';
UPDATE public.artists SET name_zh_hans = '隋建国' WHERE artist_id = 'CN-SUIJG-01';
UPDATE public.artists SET name_zh_hans = '丁乙' WHERE artist_id = 'CN-DINGYI-01';
UPDATE public.artists SET name_zh_hans = '吴冠中' WHERE artist_id = 'CN-WUGZ-01';
UPDATE public.artists SET name_zh_hans = '徐悲鸿' WHERE artist_id = 'CN-XUBH-01';
UPDATE public.artists SET name_zh_hans = '朱德群' WHERE artist_id = 'CN-CHUTC-01';
UPDATE public.artists SET name_zh_hans = '林风眠' WHERE artist_id = 'CN-LINFM-01';
UPDATE public.artists SET name_zh_hans = '张大千' WHERE artist_id = 'CN-ZHANGDQ-01';
UPDATE public.artists SET name_zh_hans = '齐白石' WHERE artist_id = 'CN-QIBS-01';
UPDATE public.artists SET name_zh_hans = '潘天寿' WHERE artist_id = 'CN-PANTS-01';
UPDATE public.artists SET name_zh_hans = '李铁夫' WHERE artist_id = 'CN-LITF-01';
UPDATE public.artists SET name_zh_hans = '大尾象工作组' WHERE artist_id = 'CN-BIGTAIL-01';
UPDATE public.artists SET name_zh_hans = '王庆松' WHERE artist_id = 'CN-WANGQS-01';
UPDATE public.artists SET name_zh_hans = '宋冬' WHERE artist_id = 'CN-SONGDONG-01';
UPDATE public.artists SET name_zh_hans = '尹秀珍' WHERE artist_id = 'CN-YINXZ-01';
UPDATE public.artists SET name_zh_hans = '陈劭雄' WHERE artist_id = 'CN-CHENSX-01';
UPDATE public.artists SET name_zh_hans = '展望' WHERE artist_id = 'CN-ZHANWANG-01';
UPDATE public.artists SET name_zh_hans = '沈少民' WHERE artist_id = 'CN-SHENSM-01';
UPDATE public.artists SET name_zh_hans = '王克平' WHERE artist_id = 'CN-WANGKP-01';
UPDATE public.artists SET name_zh_hans = '徐坦' WHERE artist_id = 'CN-XUTAN-01';
UPDATE public.artists SET name_zh_hans = '列奥纳多·达·芬奇' WHERE artist_id = 'WEST-LEONARDO-01';
UPDATE public.artists SET name_zh_hans = '卡拉瓦乔' WHERE artist_id = 'WEST-CARAVAGGIO-01';
UPDATE public.artists SET name_zh_hans = '克劳德·莫奈' WHERE artist_id = 'WEST-MONET-01';
UPDATE public.artists SET name_zh_hans = '巴勃罗·毕加索' WHERE artist_id = 'WEST-PICASSO-01';
UPDATE public.artists SET name_zh_hans = '亨利·马蒂斯' WHERE artist_id = 'WEST-MATISSE-01';
UPDATE public.artists SET name_zh_hans = '萨尔瓦多·达利' WHERE artist_id = 'WEST-DALI-01';
UPDATE public.artists SET name_zh_hans = '瓦西里·康定斯基' WHERE artist_id = 'WEST-KANDINSKY-01';
UPDATE public.artists SET name_zh_hans = '乔治亚·奥基芙' WHERE artist_id = 'WEST-OKEEFFE-01';
UPDATE public.artists SET name_zh_hans = '亨利·摩尔' WHERE artist_id = 'WEST-MOORE-01';
UPDATE public.artists SET name_zh_hans = '弗朗西斯·培根' WHERE artist_id = 'WEST-BACON-01';
UPDATE public.artists SET name_zh_hans = '杰克逊·波洛克' WHERE artist_id = 'WEST-POLLOCK-01';
UPDATE public.artists SET name_zh_hans = '马塞尔·杜尚' WHERE artist_id = 'WEST-DUCHAMP-01';
UPDATE public.artists SET name_zh_hans = '班克斯' WHERE artist_id = 'INTL-BANKSY-01';
UPDATE public.artists SET name_zh_hans = '草间弥生' WHERE artist_id = 'INTL-KUSAMA-01';
UPDATE public.artists SET name_zh_hans = '辛迪·舍曼' WHERE artist_id = 'INTL-SHERMAN-01';
UPDATE public.artists SET name_zh_hans = '比尔·维奥拉' WHERE artist_id = 'INTL-VIOLA-01';
UPDATE public.artists SET name_zh_hans = '玛丽娜·阿布拉莫维奇' WHERE artist_id = 'INTL-ABRAMOVIC-01';
UPDATE public.artists SET name_zh_hans = '安尼什·卡普尔' WHERE artist_id = 'INTL-KAPOOR-01';
UPDATE public.artists SET name_zh_hans = '卡拉·沃克' WHERE artist_id = 'INTL-WALKER-01';
UPDATE public.artists SET name_zh_hans = '村上隆' WHERE artist_id = 'INTL-MURAKAMI-01';
UPDATE public.artists SET name_zh_hans = '杰夫·昆斯' WHERE artist_id = 'INTL-KOONS-01';
UPDATE public.artists SET name_zh_hans = '达米恩·赫斯特' WHERE artist_id = 'INTL-HIRST-01';
UPDATE public.artists SET name_zh_hans = '亚历山大·考尔德' WHERE artist_id = 'INTL-CALDER-01';
UPDATE public.artists SET name_zh_hans = '朗·穆克' WHERE artist_id = 'INTL-MUECK-01';
UPDATE public.artists SET name_zh_hans = '安藤忠雄' WHERE artist_id = 'INTL-ANDO-01';
UPDATE public.artists SET name_zh_hans = '芭芭拉·克鲁格' WHERE artist_id = 'INTL-KRUGER-01';
UPDATE public.artists SET name_zh_hans = '翠西·艾敏' WHERE artist_id = 'INTL-EMIN-01';
UPDATE public.artists SET name_zh_hans = '帕特丽夏·皮奇尼尼' WHERE artist_id = 'INTL-PICCININI-01';
UPDATE public.artists SET name_zh_hans = '克里斯托与珍妮-克劳德' WHERE artist_id = 'INTL-CHRISTO-01';
UPDATE public.artists SET name_zh_hans = '莱安德罗·埃利希' WHERE artist_id = 'INTL-ERLICH-01';
UPDATE public.artists SET name_zh_hans = '阿什利·比克顿' WHERE artist_id = 'INTL-BICKERTON-01';
