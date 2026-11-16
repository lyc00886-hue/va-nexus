/** Byte-exact public-page copy. Locale JSON must match this table. */
export const PUBLIC_KEYS = [
  'public.siteName',
  'public.landing.title',
  'public.landing.metaDescription',
  'public.landing.headline',
  'public.landing.intro',
  'public.landing.ctaClassroom',
  'public.landing.ctaCurriculum',
  'public.curriculum.title',
  'public.curriculum.metaDescription',
  'public.curriculum.headline',
  'public.curriculum.intro',
  'public.curriculum.hkdse.title',
  'public.curriculum.hkdse.body',
  'public.curriculum.ib.title',
  'public.curriculum.ib.body',
  'public.curriculum.igcse.title',
  'public.curriculum.igcse.body',
  'public.curriculum.ap.title',
  'public.curriculum.ap.body',
  'public.curriculum.socratic.title',
  'public.curriculum.socratic.body',
  'public.curriculum.udl.title',
  'public.curriculum.udl.body',
  'public.curriculum.disclaimer',
  'public.og.imageAlt',
] as const

export type PublicKey = (typeof PUBLIC_KEYS)[number]
export type PublicLocale = 'zh-Hant' | 'en' | 'zh-Hans'

export const OFFICIAL_PUBLIC_COPY: Record<PublicLocale, Record<PublicKey, string>> = {
  'zh-Hant': {
    'public.siteName': 'VA-Nexus',
    'public.landing.title': 'VA-Nexus · 視覺藝術學習平台',
    'public.landing.metaDescription':
      'VA-Nexus 公開頁介紹香港中學文憑試視覺藝術、IB、IGCSE、AP Art & Design，以及蘇格拉底式提問防代寫鷹架，同共融學習嘅 UDL 顯示同閱讀設定。',
    'public.landing.headline': '視覺藝術學習平台',
    'public.landing.intro':
      '呢度有香港中學文憑試視覺藝術（HKDSE Visual Arts）、IB、IGCSE、同 AP Art & Design 嘅公開課程概覽。課堂學習支援用蘇格拉底式提問同詞彙鷹架，唔提供一鍵代寫全文。亦有共融學習嘅 UDL 顯示同閱讀設定。',
    'public.landing.ctaClassroom': '進入課堂地圖',
    'public.landing.ctaCurriculum': '睇公開課程概覽',
    'public.curriculum.title': '公開課程概覽 · VA-Nexus',
    'public.curriculum.metaDescription':
      'VA-Nexus 公開課程概覽：香港中學文憑試視覺藝術、IB、IGCSE、AP Art & Design，以及蘇格拉底式提問防代寫鷹架，同共融學習嘅 UDL 顯示同閱讀設定。',
    'public.curriculum.headline': '公開課程概覽',
    'public.curriculum.intro':
      '以下係公開課程概覽，方便教師同學生先了解平台涵蓋嘅課程方向。概覽唔等於而家課堂地圖已有完整對應課程，亦唔係任何考試機構批核。',
    'public.curriculum.hkdse.title': '香港中學文憑試視覺藝術（HKDSE Visual Arts）',
    'public.curriculum.hkdse.body':
      '香港中學文憑試視覺藝術係而家課堂地圖嘅主要課程方向，涵蓋評賞、創作同校本評核（SBA）學習支援。呢度唔會當作考評局正式成績或官方批核。',
    'public.curriculum.ib.title': 'IB 視覺藝術',
    'public.curriculum.ib.body':
      '公開概覽亦涵蓋 IB 視覺藝術嘅學習方向，方便了解平台點樣支援探究同評賞。呢頁唔表示課堂地圖已上線完整 IB 課程，亦唔係國際文憑組織批核。',
    'public.curriculum.igcse.title': 'IGCSE Art & Design',
    'public.curriculum.igcse.body':
      '公開概覽涵蓋 IGCSE Art & Design 嘅學習方向，方便了解平台點樣支援課堂創作同評賞。呢頁唔表示課堂地圖已上線完整 IGCSE 課程，亦唔係 Cambridge 或其他考試機構批核。',
    'public.curriculum.ap.title': 'AP Art & Design',
    'public.curriculum.ap.body':
      '公開概覽涵蓋 AP Art & Design 嘅學習方向，方便了解平台點樣支援創作探究同評賞。呢頁唔表示課堂地圖已上線完整 AP 課程，亦唔係 College Board 批核。',
    'public.curriculum.socratic.title': '蘇格拉底式提問，防止代寫',
    'public.curriculum.socratic.body': '課堂學習支援用蘇格拉底式提問同詞彙鷹架，一步一問，唔提供一鍵代寫全文。',
    'public.curriculum.udl.title': '共融學習／UDL 顯示同閱讀設定',
    'public.curriculum.udl.body':
      '平台提供共融學習嘅 UDL 顯示同閱讀設定，例如字級、間距、減少動態同專注隧道。產品面唔加學生診斷標籤，亦唔當醫學判斷。',
    'public.curriculum.disclaimer':
      '以上係產品公開概覽同承諾說明，非教育局、考評局、國際文憑組織、Cambridge、College Board 或任何官方認證／批核。呢度唔提供真題，亦唔會輸出校名、校徽、教師真實姓名或學生敏感身份。',
    'public.og.imageAlt': 'VA-Nexus 品牌圖',
  },
  en: {
    'public.siteName': 'VA-Nexus',
    'public.landing.title': 'VA-Nexus · Visual Arts learning platform',
    'public.landing.metaDescription':
      'VA-Nexus public pages introduce HKDSE Visual Arts, IB, IGCSE, and AP Art & Design, plus Socratic scaffolding against ghostwriting and inclusive UDL display and reading settings.',
    'public.landing.headline': 'Visual Arts learning platform',
    'public.landing.intro':
      'This public site offers curriculum overviews for HKDSE Visual Arts, IB, IGCSE, and AP Art & Design. Learning support uses Socratic questioning and vocabulary scaffolds, and does not offer one-click full-essay ghostwriting. Inclusive UDL display and reading settings are also available.',
    'public.landing.ctaClassroom': 'Enter the classroom map',
    'public.landing.ctaCurriculum': 'View the public curriculum overview',
    'public.curriculum.title': 'Public curriculum overview · VA-Nexus',
    'public.curriculum.metaDescription':
      'VA-Nexus public curriculum overview: HKDSE Visual Arts, IB, IGCSE, AP Art & Design, Socratic scaffolding against ghostwriting, and inclusive UDL display and reading settings.',
    'public.curriculum.headline': 'Public curriculum overview',
    'public.curriculum.intro':
      'This is a public curriculum overview, so teachers and students can first see the curriculum directions the platform covers. An overview does not mean the classroom map already has a full matching course, and it is not an endorsement by any examination body.',
    'public.curriculum.hkdse.title': 'HKDSE Visual Arts',
    'public.curriculum.hkdse.body':
      'HKDSE Visual Arts is the main curriculum direction of the classroom map today. It covers appreciation, making, and school-based assessment (SBA) learning support. This is not an official HKEAA result or endorsement.',
    'public.curriculum.ib.title': 'IB Visual Arts',
    'public.curriculum.ib.body':
      'This public overview also covers the learning direction of IB Visual Arts, so readers can see how the platform supports inquiry and appreciation. This page does not mean a full IB course is already live on the classroom map, and it is not an International Baccalaureate endorsement.',
    'public.curriculum.igcse.title': 'IGCSE Art & Design',
    'public.curriculum.igcse.body':
      'This public overview covers the learning direction of IGCSE Art & Design, so readers can see how the platform supports classroom making and appreciation. This page does not mean a full IGCSE course is already live on the classroom map, and it is not a Cambridge or other exam-board endorsement.',
    'public.curriculum.ap.title': 'AP Art & Design',
    'public.curriculum.ap.body':
      'This public overview covers the learning direction of AP Art & Design, so readers can see how the platform supports creative inquiry and appreciation. This page does not mean a full AP course is already live on the classroom map, and it is not a College Board endorsement.',
    'public.curriculum.socratic.title': 'Socratic questioning against ghostwriting',
    'public.curriculum.socratic.body':
      'Learning support uses Socratic questioning and vocabulary scaffolds, one question at a time, and does not offer one-click full-essay ghostwriting.',
    'public.curriculum.udl.title': 'Inclusive UDL display and reading settings',
    'public.curriculum.udl.body':
      'The platform provides inclusive UDL display and reading settings, such as type size, spacing, reduced motion, and a focus tunnel. The product face does not add student diagnostic labels, and this is not a medical judgment.',
    'public.curriculum.disclaimer':
      'These are a public product overview and commitment notes — not an EDB, HKEAA, International Baccalaureate, Cambridge, College Board, or any official certification or endorsement. This site does not provide live exam papers, and it will not output a school name, school crest, a teacher\'s real name, or a student\'s sensitive identity.',
    'public.og.imageAlt': 'VA-Nexus brand image',
  },
  'zh-Hans': {
    'public.siteName': 'VA-Nexus',
    'public.landing.title': 'VA-Nexus · 视觉艺术学习平台',
    'public.landing.metaDescription':
      'VA-Nexus 公开页介绍香港中学文凭试视觉艺术、IB、IGCSE、AP Art & Design，以及苏格拉底式提问防代写鹰架，同共融学习的 UDL 显示同阅读设定。',
    'public.landing.headline': '视觉艺术学习平台',
    'public.landing.intro':
      '这里有香港中学文凭试视觉艺术（HKDSE Visual Arts）、IB、IGCSE、同 AP Art & Design 的公开课程概览。课堂学习支援用苏格拉底式提问同词汇鹰架，不提供一键代写全文。亦有共融学习的 UDL 显示同阅读设定。',
    'public.landing.ctaClassroom': '进入课堂地图',
    'public.landing.ctaCurriculum': '看公开课程概览',
    'public.curriculum.title': '公开课程概览 · VA-Nexus',
    'public.curriculum.metaDescription':
      'VA-Nexus 公开课程概览：香港中学文凭试视觉艺术、IB、IGCSE、AP Art & Design，以及苏格拉底式提问防代写鹰架，同共融学习的 UDL 显示同阅读设定。',
    'public.curriculum.headline': '公开课程概览',
    'public.curriculum.intro':
      '以下是公开课程概览，方便教师同学生先了解平台涵盖的课程方向。概览不等于现在课堂地图已有完整对应课程，也不是任何考试机构批核。',
    'public.curriculum.hkdse.title': '香港中学文凭试视觉艺术（HKDSE Visual Arts）',
    'public.curriculum.hkdse.body':
      '香港中学文凭试视觉艺术是现在课堂地图的主要课程方向，涵盖评赏、创作同校本评核（SBA）学习支援。这里不会当作考评局正式成绩或官方批核。',
    'public.curriculum.ib.title': 'IB 视觉艺术',
    'public.curriculum.ib.body':
      '公开概览亦涵盖 IB 视觉艺术的学习方向，方便了解平台怎样支援探究同评赏。此页不表示课堂地图已上线完整 IB 课程，也不是国际文凭组织批核。',
    'public.curriculum.igcse.title': 'IGCSE Art & Design',
    'public.curriculum.igcse.body':
      '公开概览涵盖 IGCSE Art & Design 的学习方向，方便了解平台怎样支援课堂创作同评赏。此页不表示课堂地图已上线完整 IGCSE 课程，也不是 Cambridge 或其他考试机构批核。',
    'public.curriculum.ap.title': 'AP Art & Design',
    'public.curriculum.ap.body':
      '公开概览涵盖 AP Art & Design 的学习方向，方便了解平台怎样支援创作探究同评赏。此页不表示课堂地图已上线完整 AP 课程，也不是 College Board 批核。',
    'public.curriculum.socratic.title': '苏格拉底式提问，防止代写',
    'public.curriculum.socratic.body': '课堂学习支援用苏格拉底式提问同词汇鹰架，一步一问，不提供一键代写全文。',
    'public.curriculum.udl.title': '共融学习／UDL 显示同阅读设定',
    'public.curriculum.udl.body':
      '平台提供共融学习的 UDL 显示同阅读设定，例如字级、间距、减少动态同专注隧道。产品面不加学生诊断标签，也不当医学判断。',
    'public.curriculum.disclaimer':
      '以上是产品公开概览同承诺说明，非教育局、考评局、国际文凭组织、Cambridge、College Board 或任何官方认证／批核。这里不提供真题，也不会输出校名、校徽、教师真实姓名或学生敏感身份。',
    'public.og.imageAlt': 'VA-Nexus 品牌图',
  },
}
