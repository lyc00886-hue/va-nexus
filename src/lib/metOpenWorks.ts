export const MET_OPEN_SOURCE = 'Metropolitan Museum of Art, New York, NY'
export const MET_OPEN_LICENCE = 'Public Domain · The Met Open Access'

export type MetOpenWork = {
  title: string
  artist: string
  year: string
  intro?: { 'zh-Hant': string; 'zh-Hans': string; en: string }
}

export const MET_OPEN_WORKS: Record<string, MetOpenWork> = {
  '10996': { title: "Still Life", artist: "William Michael Harnett", year: "1888" },
  '11141': { title: "The Studio", artist: "Winslow Homer", year: "1867" },
  '11737': { title: "Still Life with Cake", artist: "Raphaelle Peale", year: "1818" },
  '36005': { title: "Mountain Market, Clearing Mist", artist: "Xia Gui", year: "early 13th century" },
  '36141': { title: "Returning Home in a Driving Rain", artist: "Xia Gui", year: "early 13th century" },
  '36432': { title: "Plum blossoms", artist: "Jin Nong", year: "dated 1757" },
  '39547': { title: "Bamboo, old tree, and rock", artist: "Wu Zhen", year: "dated 1338" },
  '40053': { title: "Xiantang Estuary", artist: "Xia Gui", year: "ca. 1200" },
  '40087': { title: "Windswept lakeshore", artist: "Xia Gui", year: "13th century" },
  '40432': { title: "Scholar in a Lakeside Pavilion", artist: "Samoje", year: "late 18th century" },
  '40454': { title: "Beneficent Rain", artist: "Zhang Yucai", year: "late 13th–early 14th century" },
  '40456': { title: "Bamboo and rocks", artist: "Li Kan", year: "dated 1318" },
  '41484': { title: "Lofty Scholar among Streams and Mountains, in the manner of Juran", artist: "Wang Jian", year: "late 17th century" },
  '44601': { title: "The Cassia Grove Studio", artist: "Wen Zhengming", year: "ca. 1532" },
  '45422': { title: "Rock and Waves", artist: "Maruyama Ōkyo 円山応挙", year: "dated 1773" },
  '45682': { title: "Silent fisherman in an autumn wood", artist: "Shen Zhou", year: "dated 1475" },
  '45683': { title: "Autumn Colors among Streams and Mountains", artist: "Shen Zhou", year: "ca. 1490–1500" },
  '45756': { title: "Ink bamboo", artist: "Tang Yin", year: "early 16th century" },
  '48893': { title: "Woman Walking in the Snow", artist: "Utagawa Hiroshige", year: "1840s–early 1850s" },
  '48945': { title: "Landscape after Dong Yuan, Juran, Ma Yuan, and Xia Gui", artist: "Li Zai", year: "dated yiwei 乙未, 1655?" },
  '49181': { title: "Thirty-six Peaks of Mount Huang Recollected", artist: "Shitao (Zhu Ruoji)", year: "ca. 1705" },
  '49241': { title: "Ink bamboo", artist: "Li Shan", year: "dated 1749" },
  '49549': { title: "Anchorage on a rainy night", artist: "Shen Zhou", year: "dated 1477" },
  '51482': { title: "Immortals' Studio by Stream and Bamboo", artist: "Unidentified artist", year: "18th century or later" },
  '53223': { title: "Mountain Landscape", artist: "Tenshō Shūbun", year: "early–mid-15th century" },
  '63203': { title: "Landscape after Xia Gui (active ca. 1195–1230), from the Mustard Seed Garden Manual of Painting", artist: "Wang Gai", year: "first edition printed in 1679" },
  '78108': { title: "Bamboo in the Wind", artist: "Dapeng Zhengkun (Taihō Shōkon)", year: "mid-18th century" },
  '286175': { title: "[Still Life with Books]", artist: "William Notman", year: "1870s–80s" },
  '338696': { title: "Summer (Aestas), from \"The Seasons\"", artist: "Pieter van der Heyden", year: "1570" },
  '338964': { title: "The Island of San Giorgio Maggiore, Venice", artist: "Giacomo Guardi", year: "1784–1835" },
  '435809': { title: "The Harvesters", artist: "Pieter Bruegel the Elder", year: "1565" },
  '435866': { title: "Apples", artist: "Paul Cézanne", year: "1878–79" },
  '435881': { title: "Still Life with a Ginger Jar and Eggplants", artist: "Paul Cézanne", year: "1893–94" },
  '435882': { title: "Still Life with Apples and a Pot of Primroses", artist: "Paul Cézanne", year: "ca. 1890" },
  '435883': { title: "Still Life with Apples and Pears", artist: "Paul Cézanne", year: "ca. 1891–92" },
  '435884': { title: "Still Life with Jar, Cup, and Apples", artist: "Paul Cézanne", year: "ca. 1877" },
  '435887': { title: "The Silver Tureen", artist: "Jean Siméon Chardin", year: "ca. 1728–30" },
  '435904': { title: "Still Life with a Skull and a Writing Quill", artist: "Pieter Claesz", year: "1628" },
  '436186': { title: "Still Life with Silver", artist: "Alexandre François Desportes", year: "1720s" },
  '436293': { title: "Still Life with Flowers and Fruit", artist: "Henri Fantin-Latour", year: "1866" },
  '436294': { title: "Still Life with Pansies", artist: "Henri Fantin-Latour", year: "1874" },
  '436305': { title: "Still Life", artist: "Georg Flegel", year: "probably ca. 1625–30" },
  '436596': { title: "Venice from the Bacino di San Marco", artist: "Francesco Guardi", year: "ca. 1765–75" },
  '436599': { title: "The Grand Canal above the Rialto", artist: "Francesco Guardi", year: "late 1760s" },
  '437310': { title: "The Boulevard Montmartre on a Winter Morning", artist: "Camille Pissarro", year: "1897" },
  '437429': { title: "Still Life with Peaches", artist: "Auguste Renoir", year: "1881" },
  '437755': { title: "In the Studio", artist: "Alfred Stevens", year: "1888" },
  '437989': { title: "Dish of Apples", artist: "Paul Cézanne", year: "ca. 1876–77" },
  '437999': { title: "Still Life with Teapot and Fruit", artist: "Paul Gauguin", year: "1896" },
  '438023': { title: "The Antechamber of the Sala del Maggior Consiglio", artist: "Francesco Guardi", year: "ca. 1765–68" },
  '438117': { title: "The Island of San Michele, Venice", artist: "Francesco Guardi", year: "1770s" },
  '459235': { title: "Panaromic View of the Bacino di San Marco, Looking up the Giudecca Canal", artist: "Francesco Guardi", year: "1780–93" },
  '459619': { title: "Panorama of Venice from the Bacino di San Marco, Including the Project for the Proposed Teatro Manin", artist: "Francesco Guardi", year: "ca. 1788–93" },
  '670896': { title: "Plum Blossoms", artist: "Motsurin Jōtō (Bokusai)", year: "15th century" },
  '700610': { title: "Still Life with Corn", artist: "Charles Ethan Porter", year: "ca. 1880" },
  '813060': { title: "A View of the Nieuwe Korenbeurs on the Damrak, Amsterdam, the Tower of the Oude Kerk Beyond", artist: "Hermanus Petrus Schouten", year: "ca. 1770" },
  '816192': { title: "Ink Plum", artist: "Byōsen Myōshitsu", year: "15th century" },
  '845166': { title: "Ink Plum and Bamboo", artist: "Hoashi Kyōu 帆足杏雨", year: "1856 (Ansei 3)" },
  '853798': { title: "The Studio of Prolonged Soughing", artist: "You Yin", year: "dated 1851" },
  '916546': { title: "Ink Bamboo", artist: "Kimura Kenkadō", year: "late 18th century" },

  '333987': { title: "The Photographer Sescau (Le Photographe Sescau)", artist: "Henri de Toulouse-Lautrec", year: "1894", intro: { 'zh-Hant': "海報見到攝影師正對住一個大人影相，鏡頭同人好近。呢幅提醒：社區研究時影人之前要問准，尊重私隱。", 'zh-Hans': "海报可见摄影师正对着一个大人照相，镜头与人很近。用以提醒：社区研究时拍人之前要问准，尊重私隐。", en: "The poster shows a photographer taking a picture of an adult at close range. Use it to remember: in community research, ask first before photographing people, and respect privacy." } },
  '10450': { title: "Fly Market", artist: "William P. Chappel", year: "1870s", intro: { 'zh-Hant': "畫面係城市街市同橋上人流，小販同路過嘅人都喺公共地方活動。觀察近身社區時，影人之前要問准。", 'zh-Hans': "画面是城市街市与桥上人流，小贩与路过行人都在公共地方活动。观察身边社区时，拍人之前要问准。", en: "The picture shows a city market and people on a bridge. When you observe a nearby community, ask first before photographing people." } },
  '10460': { title: "Tea Party", artist: "William P. Chappel", year: "1870s", intro: { 'zh-Hant': "一班人喺屋外聚埋傾偈同作客。訪問之後要揀有用嘅故事嚟發展主題，唔好全部公開。", 'zh-Hans': "一群人在屋外聚在一起交谈与作客。访问之后要拣有用故事再发展主题，不要全部公开。", en: "People gather outside houses to talk and visit. After an interview, keep the stories that help your theme; do not publish everything." } },
  '11618': { title: "Artist Sketching at Stony Brook, New York (from McGuire Scrapbook)", artist: "William Sidney Mount", year: "1840", intro: { 'zh-Hant': "一個寫生嘅人對住地方做速寫。視覺研究常用觀察、速寫同筆記。", 'zh-Hans': "一个写生者对着地方做速写。视觉研究常用观察、速写与笔记。", en: "A person sketches a place from observation. Visual research often uses looking, sketching, and notes." } },
  '10453': { title: "House Raising", artist: "William P. Chappel", year: "1870s", intro: { 'zh-Hant': "街坊一齊撑起屋架，係社區入面共同做嘢嘅過程。發展創作時都要記錄過程同改動原因。", 'zh-Hans': "街坊一起撑起屋架，是社区里面共同做事过程。发展创作时都要记录过程与改动原因。", en: "Neighbours raise a house frame together, a process of making in a community. When you develop a work, record the process and why you change it." } },
  '35990': { title: "Azure Cliff with Red Maples", artist: "Wu Bin", year: "dated 1603", intro: { 'zh-Hant': "吳彬用濃淡墨同紅楓，將崖石寫得陡峭而奇特，石勢仍然認得。呢幅用嚟睇佢點樣將石畫得奇。呢幅係扇面山水，唔係《十面靈璧圖卷》評賞格嗰個局部。", 'zh-Hans': "吴彬用浓淡墨与红枫，将崖石写得陡峭而奇特，石势仍可认出。用以察看他怎样将石画得奇。此幅是扇面山水，不是评赏格《十面灵璧图卷》那个局部。", en: "Wu Bin paints a steep, unusual cliff with ink washes and red maples, yet it remains readable as rock. Use this fan painting to see how he makes stone look strange. It is not the reserved front detail of Ten Views of a Lingbi Rock." } },
  '10797': { title: "Sketch from Nature", artist: "Asher Brown Durand", year: "ca. 1855", intro: { 'zh-Hant': "對住實地用鉛筆寫下樹同坡。視覺日記可以先用速寫搜集材料，再收窄成主題。", 'zh-Hans': "对着实地用铅笔写下树与坡。视觉日记可以先用速写搜集材料，再收窄成主题。", en: "The graphite study records trees and a slope from nature. A visual diary can gather materials by sketching first, then narrow them into a theme." } },
  '51803-dp154504': { title: "Album of miscellaneous paintings（其中一頁：魚同留白）", artist: "Bada Shanren (Zhu Da)", year: "約1644–1705（館藏未標精確年份）", intro: { 'zh-Hant': "呢頁用簡筆寫出魚，大片留白包圍主體，形態誇張但又仍然認得。用嚟睇 Bada Shanren（Zhu Da）嘅留白同簡筆。呢頁唔係評賞格《Fish and rocks》原檔。", 'zh-Hans': "此页用简笔写出鱼，大片留白包围主体，形态夸张但仍可认出。用以察看 Bada Shanren（Zhu Da）留白与简笔。此页不是评赏格《Fish and rocks》原档。", en: "This album leaf uses abbreviated brushwork and a wide reserved space around a fish. The form is exaggerated yet still readable. It is not the reserved Fish and rocks hanging-scroll file." } },
  '51803-dp154502': { title: "Album of miscellaneous paintings（其中一頁：山石同樹）", artist: "Bada Shanren (Zhu Da)", year: "約1644–1705（館藏未標精確年份）", intro: { 'zh-Hant': "呢頁係山水：右邊有山石同樹，前面幾株樹幹同枝葉都寫得清楚，後有石壁同遠山；左邊係對頁書法。用嚟比較邊度誇張、邊度留白，而且仍然認得係山石同樹。呢頁唔係評賞格原檔。", 'zh-Hans': "此页是山水：右边有山石与树，前面几株树干与枝叶都写得清楚，后有石壁与远山；左边是对页书法。用以比较何处夸张、何处留白，并且仍可认出是山石与树。此页不是评赏格原档。", en: "This album leaf is a landscape: the right page shows rocks and trees, with trunks and foliage in front of a rocky cliff and a distant peak; the left page is facing calligraphy. Use it to notice exaggeration, reserved space, and forms that remain readable as rock and tree. It is not the reserved appreciation-grid file." } },
  '51803-dp154497': { title: "Album of miscellaneous paintings（其中一頁：山水）", artist: "Bada Shanren (Zhu Da)", year: "約1644–1705（館藏未標精確年份）", intro: { 'zh-Hant': "呢頁係山水：右邊見到山、樹同屋舍，墨色層層疊起；左邊係對頁書法。用嚟由所見寫形式，再講方法。呢頁唔係評賞格原檔，亦唔係雜畫冊入面「山石同樹」嗰一頁。", 'zh-Hans': "此页是山水：右边可见山、树与屋舍，墨色层层叠起；左边是对页书法。用以由所见写形式，再讲方法。此页不是评赏格原档，也不是杂画册里面「山石与树」那一页。", en: "This album leaf is a landscape: the right page shows mountains, trees, and houses in layered ink; the left page is facing calligraphy. Use it to describe form from what you see, then talk about method. It is not the reserved appreciation-grid file, and it is not the rocks-and-trees leaf from the same album." } },
  '49145-dp160560': { title: "Landscape album（其中一頁：山石）", artist: "Bada Shanren (Zhu Da)", year: "dated 1699", intro: { 'zh-Hant': "呢頁山石用淡墨同留白寫成，筆觸簡但石勢仍然認得。用嚟做奇石比較嘅方法練習。呢頁唔係評賞格原檔。", 'zh-Hans': "此页山石用淡墨与留白写成，笔触简但石势仍可认出。用以做奇石比较方法练习。此页不是评赏格原档。", en: "This 1699 album leaf builds rocks with light ink and reserved space. The brush is brief, yet the form stays readable as stone." } },
  '49145-dp160561': { title: "Landscape album（其中一頁：崖石同樹）", artist: "Bada Shanren (Zhu Da)", year: "dated 1699", intro: { 'zh-Hant': "呢頁見到崖石同樹，墨線簡、留白多。用嚟練習由所見寫出方法，而唔係抄畫面。呢頁唔係評賞格原檔。", 'zh-Hans': "此页可见崖石与树，墨线简、留白多。用以练习由所见写出方法，而不是抄画面。此页不是评赏格原档。", en: "This album leaf shows a cliff and trees with brief ink lines and plenty of reserved space. Write from what you see; do not copy the picture." } },
  '49145-dp160563': { title: "Landscape album（其中一頁：山水）", artist: "Bada Shanren (Zhu Da)", year: "dated 1699", intro: { 'zh-Hant': "呢頁係 1699 年山水冊入面其中一頁：山石密、樹林同松枝交疊，墨色濃淡對比較強。用嚟講 Bada Shanren（Zhu Da）嘅方法，唔好當成要臨摹呢一頁。呢頁唔係評賞格原檔。", 'zh-Hans': "此页是 1699 年山水册里面其中一页：山石密、树林与松枝交叠，墨色浓淡对比较强。用以讲 Bada Shanren（Zhu Da）方法，不要当成要临摹此页。此页不是评赏格原档。", en: "This 1699 album leaf is a dense landscape of mountain rocks, woods, and pine branches, with strong dark-and-light ink contrast. Use it to talk about Bada Shanren (Zhu Da) method; do not treat it as a leaf to copy. It is not the reserved appreciation-grid file." } },
}

export function metOpenId(image?: string): string | undefined {
  const match = image?.match(/\/met-open\/(\d+(?:-dp\d+)?)\.jpg$/)
  return match?.[1]
}
