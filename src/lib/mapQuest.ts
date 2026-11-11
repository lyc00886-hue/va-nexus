/**
 * Vertical quest map for the map1 student surface.
 * 3 sections × 5 units × 4 nodes. The fourth node of each unit is a mild chest.
 * Section nicknames stay student-safe: S6 is 中六練習 (no 奪星).
 */

export const QUEST_FORMS = ['s4', 's5', 's6'] as const

export type QuestFormId = (typeof QUEST_FORMS)[number]

export type QuestLocale = 'zh-Hant' | 'zh-Hans' | 'en'

export type QuestCopy = Record<QuestLocale, string>

export type QuestNode = {
  id: string
  code: string
  chest: boolean
  name: QuestCopy
  line: QuestCopy
}

export type QuestUnit = {
  id: string
  code: string
  color: string
  title: QuestCopy
  focus: QuestCopy
  nodes: readonly [QuestNode, QuestNode, QuestNode, QuestNode]
}

export type QuestSection = {
  id: QuestFormId
  chip: 'S4' | 'S5' | 'S6'
  short: QuestCopy
  name: QuestCopy
  units: readonly [QuestUnit, QuestUnit, QuestUnit, QuestUnit, QuestUnit]
}

/** Left, middle, right, middle. A sine step, not a pipe. */
export const QUEST_LANE = [22, 50, 78, 50] as const

export const QUEST_COLORS = {
  teal: '#0D9488',
  amber: '#D97706',
  indigo: '#4F46E5',
  rose: '#E11D48',
  purple: '#7C3AED',
} as const

const UNIT_COLORS = [
  QUEST_COLORS.teal,
  QUEST_COLORS.amber,
  QUEST_COLORS.indigo,
  QUEST_COLORS.rose,
  QUEST_COLORS.purple,
] as const

/** Pressed edge under the 3D face. */
export const QUEST_EDGE: Record<string, string> = {
  '#0D9488': '#0F766E',
  '#D97706': '#B45309',
  '#4F46E5': '#4338CA',
  '#E11D48': '#BE123C',
  '#7C3AED': '#6D28D9',
}

export const QUEST_FORM_EVENT = 'va-nexus:quest-form'
export const QUEST_CALM_EVENT = 'va-nexus:quest-calm'
export const QUEST_CALM_KEY = 'va-nexus:quest-calm'

type Trio = readonly [string, string, string]

function L([hant, hans, en]: Trio): QuestCopy {
  return { 'zh-Hant': hant, 'zh-Hans': hans, en }
}

function lesson(section: QuestFormId, unit: number, index: number, globalUnit: number, name: Trio, line: Trio): QuestNode {
  const code = `${globalUnit}-${index}`
  return {
    id: `${section}-u${unit}-n${index}`,
    code,
    chest: false,
    name: L(name),
    line: L(line),
  }
}

function chest(section: QuestFormId, unit: number, globalUnit: number, line: Trio): QuestNode {
  const code = `${globalUnit}-4`
  return {
    id: `${section}-u${unit}-n4`,
    code,
    chest: true,
    name: L(['單元寶箱', '单元宝箱', 'Unit chest']),
    line: L(line),
  }
}

function unit(
  section: QuestFormId,
  index: number,
  globalUnit: number,
  title: Trio,
  focus: Trio,
  lessons: readonly [readonly [Trio, Trio], readonly [Trio, Trio], readonly [Trio, Trio]],
  chestLine: Trio,
): QuestUnit {
  const nodes = [
    lesson(section, index, 1, globalUnit, lessons[0][0], lessons[0][1]),
    lesson(section, index, 2, globalUnit, lessons[1][0], lessons[1][1]),
    lesson(section, index, 3, globalUnit, lessons[2][0], lessons[2][1]),
    chest(section, index, globalUnit, chestLine),
  ] as const
  return {
    id: `${section}-u${index}`,
    code: `${section.toUpperCase()}-U${index}`,
    color: UNIT_COLORS[index - 1],
    title: L(title),
    focus: L(focus),
    nodes,
  }
}

const CHEST_LINE: Trio = ['完成可開', '完成可开', 'Opens when the unit is done']

function section(
  id: QuestFormId,
  chip: QuestSection['chip'],
  short: Trio,
  name: Trio,
  units: readonly [QuestUnit, QuestUnit, QuestUnit, QuestUnit, QuestUnit],
): QuestSection {
  return { id, chip, short: L(short), name: L(name), units }
}

export const QUEST_SECTIONS: readonly [QuestSection, QuestSection, QuestSection] = [
  section('s4', 'S4', ['中四', '中四', 'Form 4'], ['中四築基', '中四筑基', 'Form 4 foundations'], [
    unit(
      's4',
      1,
      1,
      ['視覺眼睛開光 · 費德曼四步同詞彙', '视觉眼睛开光 · 费德曼四步与词汇', 'Eyes open · Feldman and words'],
      ['費德曼四步同詞彙', '费德曼四步与词汇', 'Feldman in four steps'],
      [
        [['表象描述', '表象描述', 'Describe what you see'], ['1-1 · 費德曼第一步', '1-1 · 费德曼第一步', '1-1 · Feldman step 1']],
        [['詞彙升級', '词汇升级', 'Sharper words'], ['1-2 · 詞彙', '1-2 · 词汇', '1-2 · Words']],
        [['形式分析', '形式分析', 'Formal analysis'], ['1-3 · 形式', '1-3 · 形式', '1-3 · Form']],
      ],
      ['評賞詞彙速查', '评赏词汇速查', 'A short critique word list'],
    ),
    unit(
      's4',
      2,
      2,
      ['素描 · 美感 · 設計思維', '素描 · 美感 · 设计思维', 'Drawing, looking, design'],
      ['素描、美感同設計', '素描、美感与设计', 'Drawing, beauty, and design'],
      [
        [['素描觀察', '素描观察', 'Draw from looking'], ['2-1 · 素描觀察', '2-1 · 素描观察', '2-1 · Draw from looking']],
        [['美感詞', '美感词', 'Words for beauty'], ['2-2 · 美感詞', '2-2 · 美感词', '2-2 · Words for beauty']],
        [['設計思維小關', '设计思维小关', 'A design step'], ['2-3 · 設計思維', '2-3 · 设计思维', '2-3 · Design thinking']],
      ],
      CHEST_LINE,
    ),
    unit(
      's4',
      3,
      3,
      ['社區藝術 · 視覺日記', '社区艺术 · 视觉日记', 'Community and a visual diary'],
      ['社區主題同視覺日記', '社区主题与视觉日记', 'A community theme and a visual diary'],
      [
        [['社區主題', '社区主题', 'Community theme'], ['3-1 · 社區主題', '3-1 · 社区主题', '3-1 · Community theme']],
        [['視覺日記', '视觉日记', 'Visual diary'], ['3-2 · 視覺日記', '3-2 · 视觉日记', '3-2 · Visual diary']],
        [['一手觀察', '一手观察', 'First-hand looking'], ['3-3 · 一手觀察', '3-3 · 一手观察', '3-3 · First-hand looking']],
      ],
      CHEST_LINE,
    ),
    unit(
      's4',
      4,
      4,
      ['自畫像 · 藝術家研究', '自画像 · 艺术家研究', 'Self-portrait and artist study'],
      ['由自畫像到藝術家研究', '由自画像到艺术家研究', 'From a self-portrait to an artist study'],
      [
        [['自畫像切入', '自画像切入', 'Start from a self-portrait'], ['4-1 · 自畫像', '4-1 · 自画像', '4-1 · Self-portrait']],
        [['藝術家轉化', '艺术家转化', 'Transform a method'], ['4-2 · 藝術家轉化', '4-2 · 艺术家转化', '4-2 · Transform a method']],
        [['草圖捨棄練習', '草图舍弃练习', 'Let a sketch go'], ['4-3 · 草圖捨棄', '4-3 · 草图舍弃', '4-3 · Let a sketch go']],
      ],
      CHEST_LINE,
    ),
    unit(
      's4',
      5,
      5,
      ['應試練習場 · 藝術評賞比較入門', '应试练习场 · 艺术评赏比较入门', 'Exam skills · Compare-works start'],
      ['藝術評賞比較入門，練習結構', '艺术评赏比较入门，练习结构', 'Compare-works start. Practice the structure.'],
      [
        [['藝術評賞比較公式', '艺术评赏比较公式', 'Compare works formula'], ['5-1 · 藝術評賞比較', '5-1 · 艺术评赏比较', '5-1 · Compare works']],
        [['共同 vs 相異練習', '共同与相异练习', 'Shared and different'], ['5-2 · 共同與相異', '5-2 · 共同与相异', '5-2 · Shared and different']],
        [['結構審題練習', '结构审题练习', 'Read the question structure'], ['5-3 · 結構審題', '5-3 · 结构审题', '5-3 · Question structure']],
      ],
      ['練習結構', '练习结构', 'Practice the structure'],
    ),
  ]),
  section('s5', 'S5', ['中五', '中五', 'Form 5'], ['中五實戰', '中五实战', 'Form 5 practice'], [
    unit(
      's5',
      1,
      6,
      ['唔係美感 · 評賞加深', '不是美感 · 评赏加深', 'Not about prettiness · critique'],
      ['美感同評賞加深', '美感与评赏加深', 'Beauty, then a deeper critique'],
      [
        [['美感觀察', '美感观察', 'Notice beauty'], ['6-1 · 美感觀察', '6-1 · 美感观察', '6-1 · Notice beauty']],
        [['評賞加深', '评赏加深', 'Critique in more depth'], ['6-2 · 評賞加深', '6-2 · 评赏加深', '6-2 · Deeper critique']],
        [['用詞練習', '用词练习', 'Practice the words'], ['6-3 · 用詞', '6-3 · 用词', '6-3 · Words']],
      ],
      CHEST_LINE,
    ),
    unit(
      's5',
      2,
      7,
      ['自我 · 傳統 · 社會', '自我 · 传统 · 社会', 'Self, tradition, society'],
      ['自我、傳統同社會', '自我、传统与社会', 'Self, tradition, and society'],
      [
        [['自我', '自我', 'Self'], ['7-1 · 自我', '7-1 · 自我', '7-1 · Self']],
        [['傳統', '传统', 'Tradition'], ['7-2 · 傳統', '7-2 · 传统', '7-2 · Tradition']],
        [['社會', '社会', 'Society'], ['7-3 · 社會', '7-3 · 社会', '7-3 · Society']],
      ],
      CHEST_LINE,
    ),
    unit(
      's5',
      3,
      8,
      ['中西評賞比較 · 角色再現', '中西评赏比较 · 角色再现', 'East–West comparison · roles'],
      ['中西評賞比較同角色再現', '中西评赏比较与角色再现', 'East–West comparison, and how roles appear'],
      [
        [['中西評賞比較', '中西评赏比较', 'East–West comparison'], ['8-1 · 中西評賞比較', '8-1 · 中西评赏比较', '8-1 · East–West comparison']],
        [['角色再現', '角色再现', 'How roles appear'], ['8-2 · 角色再現', '8-2 · 角色再现', '8-2 · How roles appear']],
        [['評賞比較練習', '评赏比较练习', 'Comparison practice'], ['8-3 · 評賞比較練習', '8-3 · 评赏比较练习', '8-3 · Comparison practice']],
      ],
      CHEST_LINE,
    ),
    unit(
      's5',
      4,
      9,
      ['SBA 實驗室 · 主題收窄同轉化', 'SBA 实验室 · 主题收窄与转化', 'SBA lab · narrow a theme'],
      ['主題收窄同轉化', '主题收窄与转化', 'Narrow a theme, then transform it'],
      [
        [['主題聚焦', '主题聚焦', 'Focus the theme'], ['9-1 · 主題聚焦', '9-1 · 主题聚焦', '9-1 · Focus the theme']],
        [['一手調查', '一手调查', 'First-hand inquiry'], ['9-2 · 一手調查', '9-2 · 一手调查', '9-2 · First-hand inquiry']],
        [['大師轉化', '大师转化', 'Transform a method'], ['9-3 · 大師轉化', '9-3 · 大师转化', '9-3 · Transform a method']],
      ],
      CHEST_LINE,
    ),
    unit(
      's5',
      5,
      10,
      ['應試練習場 · 藝術評賞比較進階', '应试练习场 · 艺术评赏比较进阶', 'Exam skills · Compare works, further'],
      ['藝術評賞比較進階，結構練習', '艺术评赏比较进阶，结构练习', 'Compare works, further. Practice the structure.'],
      [
        [['藝術評賞比較進階', '艺术评赏比较进阶', 'Compare works, further'], ['10-1 · 藝術評賞比較', '10-1 · 艺术评赏比较', '10-1 · Compare works']],
        [['共同與相異', '共同与相异', 'Shared and different'], ['10-2 · 共同與相異', '10-2 · 共同与相异', '10-2 · Shared and different']],
        [['結構練習', '结构练习', 'Structure practice'], ['10-3 · 結構練習', '10-3 · 结构练习', '10-3 · Structure practice']],
      ],
      CHEST_LINE,
    ),
  ]),
  section('s6', 'S6', ['中六', '中六', 'Form 6'], ['中六練習', '中六练习', 'Form 6 practice'], [
    unit(
      's6',
      1,
      11,
      ['視覺日記 · 課程起步', '视觉日记 · 课程起步', 'Visual diary, course start'],
      ['視覺日記同課程起步', '视觉日记与课程起步', 'A visual diary at the start of the course'],
      [
        [['視覺日記', '视觉日记', 'Visual diary'], ['11-1 · 視覺日記', '11-1 · 视觉日记', '11-1 · Visual diary']],
        [['課程起步', '课程起步', 'Course start'], ['11-2 · 課程起步', '11-2 · 课程起步', '11-2 · Course start']],
        [['觀察記錄', '观察记录', 'Observation notes'], ['11-3 · 觀察記錄', '11-3 · 观察记录', '11-3 · Observation notes']],
      ],
      CHEST_LINE,
    ),
    unit(
      's6',
      2,
      12,
      ['明清美學 · 當代評賞比較', '明清美学 · 当代评赏比较', 'Ming-Qing aesthetics · contemporary comparison'],
      ['明清美學同當代評賞比較', '明清美学与当代评赏比较', 'Ming-Qing aesthetics and contemporary comparison'],
      [
        [['明清美學', '明清美学', 'Ming and Qing'], ['12-1 · 明清美學', '12-1 · 明清美学', '12-1 · Ming and Qing']],
        [['當代評賞比較', '当代评赏比较', 'Contemporary comparison'], ['12-2 · 當代評賞比較', '12-2 · 当代评赏比较', '12-2 · Contemporary comparison']],
        [['評賞比較練習', '评赏比较练习', 'Comparison practice'], ['12-3 · 評賞比較練習', '12-3 · 评赏比较练习', '12-3 · Comparison practice']],
      ],
      CHEST_LINE,
    ),
    unit(
      's6',
      3,
      13,
      ['文人畫 · 符號 · 日常生活', '文人画 · 符号 · 日常生活', 'Literati painting, signs, daily life'],
      ['文人畫、符號同日常生活', '文人画、符号与日常生活', 'Literati painting, signs, and daily life'],
      [
        [['文人畫', '文人画', 'Literati painting'], ['13-1 · 文人畫', '13-1 · 文人画', '13-1 · Literati painting']],
        [['符號', '符号', 'Signs'], ['13-2 · 符號', '13-2 · 符号', '13-2 · Signs']],
        [['日常生活', '日常生活', 'Daily life'], ['13-3 · 日常生活', '13-3 · 日常生活', '13-3 · Daily life']],
      ],
      CHEST_LINE,
    ),
    unit(
      's6',
      4,
      14,
      ['SBA 實驗室 · 防降分同真實性', 'SBA 实验室 · 防降分与真实性', 'SBA lab · honest work'],
      ['真實性同排雷練習', '真实性与排雷练习', 'Keep the work honest'],
      [
        [['草圖捨棄', '草图舍弃', 'Let a sketch go'], ['14-1 · 草圖捨棄', '14-1 · 草图舍弃', '14-1 · Let a sketch go']],
        [['物料實驗', '物料实验', 'Material trials'], ['14-2 · 物料實驗', '14-2 · 物料实验', '14-2 · Material trials']],
        [['AI 套話排雷', 'AI 套话排雷', 'Spot empty phrases'], ['14-3 · 套話排雷', '14-3 · 套话排雷', '14-3 · Spot empty phrases']],
      ],
      ['真實性提示', '真实性提示', 'A note on honest work'],
    ),
    unit(
      's6',
      5,
      15,
      ['應試練習場 · 計時結構練習', '应试练习场 · 计时结构练习', 'Exam skills · timed structure'],
      ['計時結構練習', '计时结构练习', 'Timed structure practice'],
      [
        [['藝術評賞比較速練', '艺术评赏比较速练', 'Compare works, short drill'], ['15-1 · 藝術評賞比較', '15-1 · 艺术评赏比较', '15-1 · Compare works']],
        [['甲部結構', '甲部结构', 'Section A structure'], ['15-2 · 甲部結構', '15-2 · 甲部结构', '15-2 · Section A structure']],
        [['乙部審題陷阱練習', '乙部审题陷阱练习', 'Section B question traps'], ['15-3 · 審題練習', '15-3 · 审题练习', '15-3 · Question practice']],
      ],
      CHEST_LINE,
    ),
  ]),
]

export const QUEST_CHROME: Record<
  QuestLocale,
  {
    streak: string
    inspiration: string
    calm: string
    calmNote: string
    startXp: string
    start: string
    look: string
    chestReady: string
    focus: string
    settings: string
    settingsSub: string
    language: string
    stepHint: string
    access: string
    calmOn: string
    calmOff: string
    signIn: string
    guest: string
    back: string
    sections: string
    grade: string
  }
> = {
  'zh-Hant': {
    streak: '連勝',
    inspiration: '靈感',
    calm: '減少動態',
    calmNote: '減少動態開 · 氣泡靜態',
    startXp: '開始 +10 XP',
    start: '開始',
    look: '看看',
    chestReady: '完成可開',
    focus: '單元重點',
    settings: '設定',
    settingsSub: '語言／標準 · 無障礙 · 登入',
    language: '語言／標準',
    stepHint: '逐步提示',
    access: '無障礙',
    calmOn: '減少動態 · 開',
    calmOff: '減少動態 · 關',
    signIn: '登入',
    guest: '訪客繼續',
    back: '返回地圖',
    sections: '年級',
    grade: '切換年級',
  },
  'zh-Hans': {
    streak: '连胜',
    inspiration: '灵感',
    calm: '减少动态',
    calmNote: '减少动态开 · 气泡静态',
    startXp: '开始 +10 XP',
    start: '开始',
    look: '看看',
    chestReady: '完成可开',
    focus: '单元重点',
    settings: '设定',
    settingsSub: '语言／标准 · 无障碍 · 登入',
    language: '语言／标准',
    stepHint: '逐步提示',
    access: '无障碍',
    calmOn: '减少动态 · 开',
    calmOff: '减少动态 · 关',
    signIn: '登入',
    guest: '访客继续',
    back: '返回地图',
    sections: '年级',
    grade: '切换年级',
  },
  en: {
    streak: 'Days',
    inspiration: 'Ideas',
    calm: 'Less motion',
    calmNote: 'Less motion on · bubble stays still',
    startXp: 'Start +10 XP',
    start: 'Start',
    look: 'Look',
    chestReady: 'Opens when done',
    focus: 'Unit focus',
    settings: 'Settings',
    settingsSub: 'Language · reading · sign in',
    language: 'Language',
    stepHint: 'Step by step',
    access: 'Access',
    calmOn: 'Less motion · on',
    calmOff: 'Less motion · off',
    signIn: 'Sign in',
    guest: 'Continue as guest',
    back: 'Back to map',
    sections: 'Year',
    grade: 'Switch year',
  },
}

/** Split a unit title only when the tail is the same line as the unit focus. */
export function questUnitFace(unit: QuestUnit, locale: QuestLocale): { title: string; subtitle: string } {
  const full = unit.title[locale]
  const focus = unit.focus[locale]
  const mark = ' · '
  const cut = full.indexOf(mark)
  if (cut > 0) {
    const tail = full.slice(cut + mark.length)
    if (tail === focus) return { title: full.slice(0, cut), subtitle: focus }
  }
  return { title: full, subtitle: '' }
}

export function questSection(id: QuestFormId): QuestSection {
  const found = QUEST_SECTIONS.find((item) => item.id === id)
  return found ?? QUEST_SECTIONS[0]
}

export function questUnits(): QuestUnit[] {
  return QUEST_SECTIONS.flatMap((item) => [...item.units])
}

export function questNodes(): QuestNode[] {
  return questUnits().flatMap((item) => [...item.nodes])
}

export function questLane(index: number): number {
  return QUEST_LANE[index] ?? QUEST_LANE[1]
}

/** The start bubble sits on the first step of the open section. */
export function questActiveId(section: QuestSection): string {
  return section.units[0].nodes[0].id
}

export function questFormFromSearch(search: string): QuestFormId {
  const raw = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('form')
  if (raw === 's4' || raw === 's5' || raw === 's6') return raw
  return 's4'
}

/** Default S4 stays out of the query. Other params, including ux, stay. */
export function withQuestForm(search: string, form: QuestFormId): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (form === 's4') params.delete('form')
  else params.set('form', form)
  const q = params.toString()
  return q ? `?${q}` : ''
}

/** Missing value is on. Only an explicit `0` turns the calm default off. */
export function questCalmFromStored(value: string | null): boolean {
  return value !== '0'
}

/** This wire keeps the start bubble still. */
export function questXpMoves(): boolean {
  return false
}

/** Student path motion. Missing or any value other than `1` stays off. */
export const QUEST_MOTION_KEY = 'va-nexus:quest-motion'

export function questMotionPrefFromStored(value: string | null): boolean {
  return value === '1'
}

/**
 * Modest path motion plays only after an explicit opt-in.
 * The display reduce-motion switch and prefers-reduced-motion both keep it off.
 */
export function questMotionPlay(input: {
  pref: boolean
  reduceMotion: boolean
  prefersReducedMotion: boolean
}): boolean {
  return input.pref === true && input.reduceMotion !== true && input.prefersReducedMotion !== true
}

export function questNode(id: string): QuestNode | undefined {
  return questNodes().find((item) => item.id === id)
}
