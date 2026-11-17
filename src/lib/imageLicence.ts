/**
 * Classroom image gate for appreciation, diagrams, and a student's own work.
 * A JSON license field, a local path, or years since an artist's death is not
 * itself a verified Public Domain or CC0 licence. Tate is not an approved source.
 * Already-shipped appreciation frames stay visible: this line does not replace them.
 */
import type { Question } from '../game/types'

export type ImageRole = 'appreciation' | 'teaching' | 'chrome' | 'own-work'

export type ImageCandidate = {
  image?: string
  artist?: string
  source?: string
  /** Accepted from callers. Never treated as verification on its own. */
  license?: string
  role: ImageRole
  /** True only when this lesson is assessing the student's own work. */
  ownWorkLesson?: boolean
}

export type ImageDecision = 'show' | 'block'

/** Verified works already on the shipped Form 4 / Form 5 appreciation grids, plus the homemade frames a later line still owns. */
const SHIPPED_APPRECIATION = [
  '/content/learning-map-illustrations/f4-pd/',
  '/content/learning-map-illustrations/f5-pd/',
  '/content/learning-map-illustrations/f4-dualread/',
  '/content/learning-map-illustrations/f5-dualread/',
  '/content/learning-map-illustrations/f6-dualread/',
  '/content/learning-map-illustrations/soft-scout/f4-dualread/',
]

/** Local copies of Met Open Access files checked isPublicDomain before they were saved. */
const VERIFIED_MET = ['/content/learning-map-illustrations/met-open/']

/** Classroom-shell chrome only. Not a teaching image, a stem, or a reference. */
const CHROME_PREFIXES = ['/content/learning-map-illustrations/moods/', '/logo.png']

const HOMEMADE_TEACHING = [
  '/content/learning-map-illustrations/f4-lesson-cards/',
  '/content/learning-map-illustrations/f5-lesson-cards/',
  '/content/learning-map-illustrations/f6-lesson-cards/',
  '/content/learning-map-illustrations/f4-stems/',
  '/content/learning-map-illustrations/f5-stems/',
  '/content/learning-map-illustrations/f6-stems/',
  '/content/learning-map-illustrations/f4-thematic/',
  '/content/learning-map-illustrations/f4-covers/',
  '/content/learning-map-illustrations/f5-covers/',
  '/content/learning-map-illustrations/f6-covers/',
  '/content/learning-map-illustrations/map-covers/',
]

const UNLICENSED_ARTISTS = ['白雙全', '白双全', '李傑', '李杰', 'Pak Sheung Chuen', 'Lee Kit']

function startsWithOne(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => path.startsWith(prefix))
}

function mentionsTate(value: string): boolean {
  return /tate\.org\.uk|\bTate\b/.test(value)
}

export function imageDecision(input: ImageCandidate): ImageDecision {
  const image = input.image?.trim() ?? ''
  const artist = input.artist?.trim() ?? ''
  const source = input.source?.trim() ?? ''

  if (mentionsTate(image) || mentionsTate(source) || mentionsTate(artist)) return 'block'
  if (input.role === 'own-work') return 'block'
  if (input.role === 'chrome') return image && startsWithOne(image, CHROME_PREFIXES) ? 'show' : 'block'
  if (UNLICENSED_ARTISTS.some((name) => artist === name)) return 'block'

  if (input.role === 'teaching') {
    if (!image) return 'show'
    if (startsWithOne(image, HOMEMADE_TEACHING)) return 'block'
    return startsWithOne(image, VERIFIED_MET) ? 'show' : 'block'
  }

  if (!image && !artist) return 'show'
  if (image && (startsWithOne(image, SHIPPED_APPRECIATION) || startsWithOne(image, VERIFIED_MET))) return 'show'
  return 'block'
}

/** True when this question would show an image the gate does not allow. */
export function questionImageBlocked(q: Question): boolean {
  if (q.type === 'dualRead') {
    if (q.image && imageDecision({ image: q.image, role: 'appreciation' }) === 'block') return true
    for (const plate of [q.plate, q.right]) {
      if (!plate) continue
      if (
        imageDecision({
          image: plate.image,
          artist: plate.artist,
          source: plate.source,
          role: 'appreciation',
        }) === 'block'
      ) {
        return true
      }
    }
    return false
  }
  return Boolean(q.image && imageDecision({ image: q.image, role: 'teaching' }) === 'block')
}
