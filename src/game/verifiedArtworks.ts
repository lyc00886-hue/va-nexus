/**
 * Verified free-licence appreciation works the classroom may cite.
 * Already-live Form 4 unit 3 lessons 2–4 and closed Form 5 unit 3 grids stay
 * as shipped. This line adds the two Form 4 unit 3 lesson 1 plates after them.
 * Sources and introductions are the live lesson records.
 */

export const VERIFIED_APPRECIATION_LESSONS = [
  'F4-U3-L2',
  'F4-U3-L3',
  'F4-U3-L4',
  'F5-U3-L1',
  'F5-U3-L2',
  'F5-U3-L3',
  'F5-U3-L4',
  'F4-U3-L1',
] as const

export type VerifiedLessonId = (typeof VERIFIED_APPRECIATION_LESSONS)[number]

export type VerifiedWork = {
  lessonId: VerifiedLessonId
  side: 'left' | 'right'
  image: string
  title: string
  artist: string
  year: string
  source: string
  intro: string
}

type Plate = {
  image?: string
  title?: string
  artist?: string
  year?: string
  source?: string
  intro?: string
}

export type AppreciationPack = {
  units?: {
    lessons?: {
      id?: string
      quiz?: { type?: string; plate?: Plate; right?: Plate }[]
    }[]
  }[]
}

function plateOf(lessonId: string, side: 'left' | 'right', plate: Plate | undefined): VerifiedWork {
  if (!plate?.image || !plate.title || !plate.artist || !plate.year || !plate.source || !plate.intro) {
    throw new Error(`[verified-artworks] ${lessonId} ${side} is incomplete`)
  }
  return {
    lessonId: lessonId as VerifiedLessonId,
    side,
    image: plate.image,
    title: plate.title,
    artist: plate.artist,
    year: plate.year,
    source: plate.source,
    intro: plate.intro,
  }
}

/** Dual-read plates from one content pack. Other images in the pack are not on this list. */
export function verifiedWorksFromPack(pack: AppreciationPack): VerifiedWork[] {
  const wanted = new Set<string>(VERIFIED_APPRECIATION_LESSONS)
  const found = new Map<string, VerifiedWork[]>()
  for (const unit of pack.units ?? []) {
    for (const lesson of unit.lessons ?? []) {
      if (!lesson.id || !wanted.has(lesson.id)) continue
      const dual = (lesson.quiz ?? []).find((quiz) => quiz.type === 'dualRead')
      found.set(lesson.id, [
        plateOf(lesson.id, 'left', dual?.plate),
        plateOf(lesson.id, 'right', dual?.right),
      ])
    }
  }
  return VERIFIED_APPRECIATION_LESSONS.filter((id) => found.has(id)).flatMap((id) => found.get(id) ?? [])
}

/** Live grids first, then this line's two works. */
export function verifiedAppreciationList(f4: AppreciationPack, f5: AppreciationPack): VerifiedWork[] {
  const byLesson = new Map<string, VerifiedWork[]>()
  for (const work of [...verifiedWorksFromPack(f4), ...verifiedWorksFromPack(f5)]) {
    const rows = byLesson.get(work.lessonId) ?? []
    rows.push(work)
    byLesson.set(work.lessonId, rows)
  }
  return VERIFIED_APPRECIATION_LESSONS.flatMap((id) => {
    const rows = byLesson.get(id)
    if (!rows || rows.length !== 2) throw new Error(`[verified-artworks] ${id} is not on the list`)
    return rows
  })
}

export function verifiedWorksForLesson(works: readonly VerifiedWork[], lessonId: string): VerifiedWork[] {
  return works.filter((work) => work.lessonId === lessonId)
}
