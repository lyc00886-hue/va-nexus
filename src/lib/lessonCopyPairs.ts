import type { ComparePlate, ConceptProfile, Lesson, Question, Unit } from '../game/types'

function add(map: Map<string, string>, zh: string | undefined, en: string | undefined) {
  const left = zh?.trim() ?? ''
  const right = en?.trim() ?? ''
  if (!left || !right || left === right) return
  if (!map.has(left)) map.set(left, right)
}

function addPlate(map: Map<string, string>, zh: ComparePlate | undefined, en: ComparePlate | undefined) {
  if (!zh || !en) return
  add(map, zh.title, en.title)
  add(map, zh.artist, en.artist)
  add(map, zh.year, en.year)
  add(map, zh.source, en.source)
  add(map, zh.intro, en.intro)
}

function addProfile(map: Map<string, string>, zh: ConceptProfile | undefined, en: ConceptProfile | undefined) {
  if (!zh || !en) return
  add(map, zh.name, en.name)
  add(map, zh.nationality, en.nationality)
  add(map, zh.active, en.active)
  add(map, zh.movement, en.movement)
  add(map, zh.technique, en.technique)
  add(map, zh.search, en.search)
}

function addQuestion(map: Map<string, string>, zh: Question, en: Question | undefined) {
  if (!en || en.type !== zh.type) return
  add(map, zh.prompt, en.prompt)
  add(map, zh.explain, en.explain)
  if (zh.type === 'mcq' && en.type === 'mcq') zh.options.forEach((item, index) => add(map, item, en.options[index]))
  if (zh.type === 'fill' && en.type === 'fill') zh.bank.forEach((item, index) => add(map, item, en.bank[index]))
  if (zh.type === 'order' && en.type === 'order') zh.items.forEach((item, index) => add(map, item, en.items[index]))
  if (zh.type === 'match' && en.type === 'match') {
    zh.pairs.forEach((pair, index) => {
      const other = en.pairs[index]
      if (!other) return
      add(map, pair.left, other.left)
      add(map, pair.right, other.right)
    })
  }
  if (zh.type === 'dualRead' && en.type === 'dualRead') {
    add(map, zh.labels[0], en.labels[0])
    add(map, zh.labels[1], en.labels[1])
    addPlate(map, zh.plate, en.plate)
    addPlate(map, zh.right, en.right)
    addProfile(map, zh.profile, en.profile)
  }
}

/** Pair one Chinese lesson with its English twin. Identical strings stay a single language. */
export function pairLessonCopy(zh: Lesson, en: Lesson, map: Map<string, string>) {
  add(map, zh.title, en.title)
  add(map, zh.subtitle, en.subtitle)
  zh.cards.forEach((card, index) => {
    const other = en.cards[index]
    if (!other) return
    add(map, card.title, other.title)
    add(map, card.body, other.body)
    card.easy.forEach((line, lineIndex) => add(map, line, other.easy[lineIndex]))
  })
  zh.questions.forEach((question, index) => addQuestion(map, question, en.questions[index]))
}

export function pairUnitCopy(zhUnits: readonly Unit[], enUnits: readonly Unit[]): Map<string, string> {
  const map = new Map<string, string>()
  const enById = new Map(enUnits.map((unit) => [unit.id, unit]))
  for (const unit of zhUnits) {
    const other = enById.get(unit.id)
    if (!other) continue
    add(map, unit.title, other.title)
    add(map, unit.subtitle, other.subtitle)
    const lessons = new Map(other.nodes.map((lesson) => [lesson.id, lesson]))
    for (const lesson of unit.nodes) {
      const twin = lessons.get(lesson.id)
      if (twin) pairLessonCopy(lesson, twin, map)
    }
  }
  return map
}
