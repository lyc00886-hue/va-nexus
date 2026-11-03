/**
 * Fixed CL media order (M1–M13). Titles are fallbacks for stub cards when a
 * unit is missing from the media-intro pack. Live titles, paper2Note, and
 * paper2Applicable always come from the locale JSON when that unit is present.
 * paper2Applicable false = not a typical portable exam-hall Paper 1 piece;
 * Paper 2 Design still follows the brief. It is not a classroom-only flag.
 */
export type MediaLocale = 'zh-Hant' | 'zh-Hans' | 'en'

export type MediaUnitSource = {
  id?: string
  mediaKey?: string
  title?: string
  intro?: string
  paper2Applicable?: boolean
  paper2Note?: string
  materials?: unknown
  safetyNotes?: unknown
  lessons?: unknown
}

export type AssembledMediaUnit = {
  id: string
  mediaKey: string
  title: string
  intro: string
  paper2Applicable: boolean
  paper2Note: string
  materials: string[]
  safetyNotes: string[]
  pending: boolean
  lessons: unknown[]
}

type Spec = {
  id: string
  mediaKey: string
  paper2Applicable: boolean
  title: Record<MediaLocale, string>
}

const EXPECTED: Spec[] = [
  {
    id: 'M1-PAINTING',
    mediaKey: 'painting',
    paper2Applicable: true,
    title: {
      'zh-Hant': '媒介入門：繪畫（壓克力／油畫）',
      en: 'Media intro: Painting (acrylic / oil)',
      'zh-Hans': '媒介入门：绘画（丙烯／油画）',
    },
  },
  {
    id: 'M2-DRAWING',
    mediaKey: 'drawing',
    paper2Applicable: true,
    title: {
      'zh-Hant': '媒介入門：素描／速寫',
      en: 'Media intro: Drawing / sketching',
      'zh-Hans': '媒介入门：素描／速写',
    },
  },
  {
    id: 'M3-SCULPTURE',
    mediaKey: 'sculpture',
    paper2Applicable: false,
    title: {
      'zh-Hant': '媒介入門：雕塑（立體）',
      en: 'Media intro: Sculpture (3D)',
      'zh-Hans': '媒介入门：雕塑（立体）',
    },
  },
  {
    id: 'M4-PRINTMAKING',
    mediaKey: 'printmaking',
    paper2Applicable: true,
    title: {
      'zh-Hant': '媒介入門：版畫',
      en: 'Media intro: Printmaking',
      'zh-Hans': '媒介入门：版画',
    },
  },
  {
    id: 'M5-FASHION',
    mediaKey: 'fashion_design',
    paper2Applicable: true,
    title: {
      'zh-Hant': '媒介入門：服裝設計',
      en: 'Media intro: Fashion design',
      'zh-Hans': '媒介入门：服装设计',
    },
  },
  {
    id: 'M6-PAPER-SCULPTURE',
    mediaKey: 'paper_sculpture',
    paper2Applicable: false,
    title: {
      'zh-Hant': '媒介入門：紙雕／立體紙藝',
      en: 'Media intro: Paper sculpture',
      'zh-Hans': '媒介入门：纸雕／立体纸艺',
    },
  },
  {
    id: 'M7-CLAY',
    mediaKey: 'clay',
    paper2Applicable: false,
    title: {
      'zh-Hant': '媒介入門：泥塑／陶泥／陶土／陶瓷',
      en: 'Media intro: Clay / 陶泥／陶土／陶瓷',
      'zh-Hans': '媒介入门：泥塑／陶泥／陶土／陶瓷',
    },
  },
  {
    id: 'M8-COLLAGE',
    mediaKey: 'collage',
    paper2Applicable: true,
    title: {
      'zh-Hant': '媒介入門：拼貼',
      en: 'Media intro: Collage',
      'zh-Hans': '媒介入门：拼贴',
    },
  },
  {
    id: 'M9-COLOUR-PENCIL-PASTEL',
    mediaKey: 'colour_pencil_pastel',
    paper2Applicable: true,
    title: {
      'zh-Hant': '媒介入門：木顏色／粉彩',
      en: 'Media intro: Colour pencil / pastel',
      'zh-Hans': '媒介入门：彩色铅笔／粉彩',
    },
  },
  {
    id: 'M10-WATERCOLOUR',
    mediaKey: 'watercolour',
    paper2Applicable: true,
    title: {
      'zh-Hant': '媒介入門：水彩',
      en: 'Media intro: Watercolour',
      'zh-Hans': '媒介入门：水彩',
    },
  },
  {
    id: 'M11-INK',
    mediaKey: 'ink',
    paper2Applicable: true,
    title: {
      'zh-Hant': '媒介入門：水墨／墨',
      en: 'Media intro: Ink / ink wash',
      'zh-Hans': '媒介入门：水墨／墨',
    },
  },
  {
    id: 'M12-PEN',
    mediaKey: 'technical_pen',
    paper2Applicable: true,
    title: {
      'zh-Hant': '媒介入門：針筆',
      en: 'Media intro: Technical pen (針筆)',
      'zh-Hans': '媒介入门：针笔',
    },
  },
  {
    id: 'M13-PHOTO',
    mediaKey: 'photography',
    paper2Applicable: true,
    title: {
      'zh-Hant': '媒介入門：攝影',
      en: 'Media intro: Photography (攝影)',
      'zh-Hans': '媒介入门：摄影',
    },
  },
]

export const EXPECTED_MEDIA_IDS = EXPECTED.map((s) => s.id)

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

function lessonsOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function assembleOne(spec: Spec, src: MediaUnitSource | undefined, locale: MediaLocale): AssembledMediaUnit {
  const lessons = lessonsOf(src?.lessons)
  const title = src?.title?.trim() || spec.title[locale]
  return {
    id: spec.id,
    mediaKey: src?.mediaKey?.trim() || spec.mediaKey,
    title,
    intro: src?.intro?.trim() ?? '',
    paper2Applicable: typeof src?.paper2Applicable === 'boolean' ? src.paper2Applicable : spec.paper2Applicable,
    paper2Note: src?.paper2Note?.trim() ?? '',
    materials: strings(src?.materials),
    safetyNotes: strings(src?.safetyNotes),
    pending: lessons.length === 0,
    lessons,
  }
}

/**
 * Always returns the 13 media in CL order. A unit with no lessons (or a missing
 * pack) becomes a pending stub instead of throwing. Extra JSON units are appended.
 */
export function assembleMediaUnits(raw: MediaUnitSource[] | null | undefined, locale: MediaLocale): AssembledMediaUnit[] {
  const list = Array.isArray(raw) ? raw : []
  const byId = new Map<string, MediaUnitSource>()
  for (const unit of list) {
    if (unit && typeof unit.id === 'string' && unit.id) byId.set(unit.id, unit)
  }
  const used = new Set<string>()
  const out = EXPECTED.map((spec) => {
    used.add(spec.id)
    return assembleOne(spec, byId.get(spec.id), locale)
  })
  for (const src of list) {
    if (!src || typeof src.id !== 'string' || !src.id || used.has(src.id)) continue
    used.add(src.id)
    const title = src.title?.trim() || src.id
    out.push(
      assembleOne(
        {
          id: src.id,
          mediaKey: src.mediaKey?.trim() || src.id,
          paper2Applicable: src.paper2Applicable !== false,
          title: { 'zh-Hant': title, en: title, 'zh-Hans': title },
        },
        src,
        locale,
      ),
    )
  }
  return out
}

/** First lesson in a unit is open; each later lesson waits on the previous one. */
export function isSequentialUnlocked(ids: string[], id: string, completed: (id: string) => boolean): boolean {
  const i = ids.indexOf(id)
  if (i < 0) return false
  if (i === 0) return true
  return completed(ids[i - 1])
}

const AIM_STOP = /^(公開試|公开考试|Exam\b|Paper\b|SBA\b|適合|适合|Suitable\b|Common\b|Flat\b|Constructed\b|Prints\b|Photo\b|Dry\b)/

/** Teaching aim only. Exam caveats stay in paper2Note, not a second copy of the intro. */
export function mediaAim(intro: string): string {
  const stripped = intro
    .replace(/（內容待老師審閱）|（内容待老师审阅）|\(Content pending teacher review\)/gi, '')
    .trim()
  if (!stripped) return ''
  const sentences = stripped
    .split(/(?<=[。！？])|(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
  const aim: string[] = []
  for (const sentence of sentences) {
    if (AIM_STOP.test(sentence)) break
    aim.push(sentence)
    if (aim.length >= 2) break
  }
  const picked = aim.length ? aim : sentences.slice(0, 1)
  return picked.join(stripped.includes('。') ? '' : ' ')
}
