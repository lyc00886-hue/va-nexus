import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  HELD_LESSON_ID,
  OFFICIAL_GOAL_KEYS,
  OFFICIAL_PARTS,
  OFFICIAL_UNIT_IDS,
  lessonPartsOnPlayer,
  officialTopics,
  officialUnit,
} from './officialFormat.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const messages = (path: string) => JSON.parse(read(path)) as Record<string, string>

const BANNED_GLYPH = /[\u7684\u628A\u5572\u6415\u63F5\u64BF\u64C0]/
const COPY_SHA = '6065dbd700af28cec13c722bcf961b101b5b4c8aa001a8591d53d89b895f4a47'

function isNewKey(key: string): boolean {
  if (key.startsWith('unit.header.') || key.startsWith('goal.') || key.startsWith('area.') || key.startsWith('part.')) {
    return true
  }
  if (
    /^unit\.f[456]u\d+\.(theme|themeMessage)$/.test(key) &&
    key !== 'unit.f4u3.theme' &&
    key !== 'unit.f4u3.themeMessage'
  ) {
    return true
  }
  return key.includes('.part.') || key.includes('.topic.')
}

function lessonsOf(file: string): { unitId: string; lessonId: string; title: string }[] {
  const pack = JSON.parse(read(file)) as {
    units: { id: string; lessons: { id: string; title: string }[] }[]
  }
  return pack.units.flatMap((unit) => unit.lessons.map((lesson) => ({ unitId: unit.id, lessonId: lesson.id, title: lesson.title })))
}

describe('official format header and five-part objectives', () => {
  const hant = messages('src/i18n/zh-Hant.json')
  const en = messages('src/i18n/en.json')
  const hans = messages('src/i18n/zh-Hans.json')

  it('copies the new zh-Hant, en, and zh-Hans lines together', () => {
    const keys = Object.keys(hant).filter(isNewKey)
    assert.equal(keys.length, 357)
    const blob = keys.map((key) => `${key}\t${hant[key]}\t${en[key]}\t${hans[key]}`).join('\n')
    assert.equal(createHash('sha256').update(blob).digest('hex'), COPY_SHA)
    for (const key of keys) {
      assert.equal(BANNED_GLYPH.test(hant[key]), false, key)
      assert.equal(en[key].length > 0, true, key)
      assert.equal(hans[key].length > 0, true, key)
      assert.equal(key in messages('src/i18n/zh-Hans.overrides.json'), true, key)
    }
    assert.equal(hant['unit.header.stage.label'], '學習階段／年級')
    assert.equal(hant['unit.header.stage.value.f4'], '第四學習階段／中四')
    assert.equal(hant['unit.header.stage.value.f5'], '第四學習階段／中五')
    assert.equal(hant['unit.header.stage.value.f6'], '第四學習階段／中六')
    assert.equal(en['unit.header.stage.value.f4'], 'Fourth learning stage / Secondary 4')
    assert.equal(hans['unit.header.stage.value.f6'], '第四学习阶段／中六')
    assert.equal(hant['goal.creativity'], '培養創意及想像力')
    assert.equal(hant['area.appreciate'], '視覺藝術評賞')
    assert.equal(hant['part.topic'], '課題')
    assert.equal(hant['unit.f4u3.theme'], '認識社區藝術')
    assert.equal(hant['unit.f4u3.themeMessage'], '社區藝術由身邊嚟。睇清楚地方同人，再用創作講出嚟。')
    assert.equal(hant['unit.f4u6.theme'], '自我、關係、故事')
    assert.equal(hant['unit.f6u2.theme'], '明清美學同當代評賞比較')
    assert.equal(en['qtype.chip.dualRead'], 'Compare works')
    assert.equal(hant['qtype.chip.dualRead'], '藝術評賞比較')
    assert.equal(hant['qtype.practiceOnly'], '練習結構 · 唔係真題')
    assert.equal(hant['lesson.f4u7l1.part.appreciate'].includes(hant['qtype.practiceOnly']), true)
    assert.equal(hant['lesson.f4u7l2.part.appreciate'].includes(hant['qtype.practiceOnly']), true)
    assert.equal(en['lesson.f4u7l1.part.appreciate'].includes(en['qtype.practiceOnly']), true)
    assert.equal(hans['lesson.f4u7l2.part.appreciate'].includes(hans['qtype.practiceOnly']), true)
  })

  it('keeps the November sentences and arranges them into the five parts', () => {
    assert.equal(hant['lesson.f4u3l3.part.element'], hant['visual.elements.hill'])
    assert.equal(hant['lesson.f4u3l3.part.principle'], hant['visual.principles.near'])
    assert.equal(hant['lesson.f4u3l3.part.appreciate'], hant['lesson.f4u3l3.goal.1'])
    assert.equal(hant['lesson.f4u3l3.part.expression'], hant['lesson.f4u3l3.goal.2'])
    assert.equal(
      hant['lesson.f4u3l3.part.making'],
      '用速寫同筆記記錄近身細節：課室角落、食堂座位、校門、返學路，或者一段記憶。影人之前要問准，尊重私隱。',
    )
    assert.equal(hant['lesson.f4u3l4.part.element'], hant['visual.elements.flavour'])
    assert.equal(hant['lesson.f4u3l4.part.principle'], hant['visual.trial'])
    assert.equal(hant['lesson.f4u3l4.part.appreciate'], hant['lesson.f4u3l4.goal.1'])
    assert.equal(hant['lesson.f4u3l4.part.expression'], hant['lesson.f4u3l4.goal.3'])
    assert.equal(hant['lesson.f4u3l4.part.making'], hant['lesson.f4u3l4.goal.2'])
    assert.equal(hant['lesson.f4u3l3.title'], '十一月：認識社區藝術——研究')
    assert.equal(hant['lesson.f4u3l4.title'], '十一月：認識社區藝術——發展同創作')
    assert.equal(hant['lesson.f4u3l3.subtitle'], '喺課堂認識咩係社區藝術，配過往案例參考。唔使出外做計劃。')
    assert.equal(hant['lesson.f4u3l4.unitLine'], '呢課承住同一主題信息，將研究發展成創作。')
    assert.equal(hant['unit.f4u3.strand.knowledge'], '睇線、形、色、質感同構圖，點樣呈現人物、地方、習慣同物件。')
    assert.equal(hant['unit.f4u3.strand.appreciate'], '睇案例同近身細節，講清楚對象、焦點，同相關視覺元素。')
    assert.equal(hant['unit.f4u3.strand.create'], '將近身洞察變成課堂短試驗，再用三句講主題、做法同感受。')
  })

  it('covers every live senior lesson and leaves F4-U2-L3 without new part keys', () => {
    const lessons = [
      ...lessonsOf('src/content/f4-demo.json'),
      ...lessonsOf('src/content/f5-demo.json'),
      ...lessonsOf('src/content/f6-demo.json'),
    ]
    const seen = new Set<string>()
    for (const lesson of lessons) {
      seen.add(lesson.lessonId)
      const format = officialUnit(lesson.unitId)
      assert.ok(format, lesson.unitId)
      assert.equal(hant[format.stageKey].startsWith('第四學習階段／'), true, lesson.unitId)
      assert.equal(hant[format.themeKey].length > 0, true, format.themeKey)
      assert.equal(hant[format.messageKey].length > 0, true, format.messageKey)
      if (lesson.lessonId === HELD_LESSON_ID) {
        assert.equal(officialTopics(lesson.lessonId), null)
        assert.equal(lessonPartsOnPlayer(lesson.lessonId), false)
        continue
      }
      const topics = officialTopics(lesson.lessonId)
      assert.ok(topics, lesson.lessonId)
      assert.equal(lesson.lessonId === 'F4-U3-L3' || lesson.lessonId === 'F4-U3-L4', !lessonPartsOnPlayer(lesson.lessonId))
      for (const topic of topics) {
        if (topic.labelKey) assert.equal(hant[topic.labelKey].length > 0, true, topic.labelKey)
        assert.equal(topic.parts.length, OFFICIAL_PARTS.length)
        for (const part of topic.parts) {
          assert.equal(hant[part.bodyKey].length > 0, true, part.bodyKey)
          assert.equal(en[part.bodyKey].length > 0, true, part.bodyKey)
          assert.equal(hans[part.bodyKey].length > 0, true, part.bodyKey)
        }
      }
    }
    assert.equal(seen.has('F4-U2-L3'), true)
    assert.equal(seen.has('F4-U6-L1'), true)
    assert.equal(Object.keys(hant).some((key) => key.startsWith('lesson.f4u2l3.')), false)
    assert.equal(hant['lesson.f4u6l1.topic.collection.label'], '收藏')
    assert.equal(hant['lesson.f4u6l1.topic.family.label'], '家庭物件')
    assert.equal(hant['lesson.f4u6l1.topic.conflict.label'], '衝突')
    assert.equal(officialTopics('F4-U6-L1')?.length, 3)
    const f4 = JSON.parse(read('src/content/f4-demo.json')) as {
      units: { lessons: { id: string; title: string }[] }[]
    }
    const titled = f4.units.flatMap((unit) => unit.lessons)
    const l2 = titled.find((lesson) => lesson.id === 'F4-U3-L2')
    const l3 = titled.find((lesson) => lesson.id === 'F4-U6-L3')
    assert.equal(l2?.title, '社區觀察：由環境搵主題')
    assert.equal([...(l2?.title ?? '')].includes('\u6435'), true)
    assert.equal(l3?.title, '延伸、願望同拼湊')
    assert.deepEqual(OFFICIAL_GOAL_KEYS.length, 4)
    assert.deepEqual(
      [...OFFICIAL_UNIT_IDS],
      f4.units.map((unit: { id: string }) => unit.id).concat(
        ['F5-U1-ORIENT', 'F5-U2-AESTHETIC', 'F5-U3-HERITAGE', 'F5-U4-SYMBOL', 'F5-U5-ROLE', 'F5-U6-CONTEMP', 'F5-U7-PORTFOLIO'],
        ['F6-U1-ORIENT', 'F6-U2-MINGQING', 'F6-U3-DAILY', 'F6-U4-LITERATI', 'F6-U5-ROLE', 'F6-U6-PORTFOLIO'],
      ),
    )
  })

  it('overlays the header and the part list without a new api file', () => {
    const year = read('src/components/game/F4YearList.tsx')
    const quest = read('src/components/game/MapQuest.tsx')
    const player = read('src/components/game/LessonPlayer.tsx')
    const frame = read('src/components/game/F4ThematicResearch.tsx')
    const view = read('src/components/game/OfficialFormat.tsx')
    const catalog = read('src/game/officialFormat.ts')
    assert.match(year, /<OfficialUnitHeader unitId=\{unit\.id\} \/>/)
    assert.match(quest, /<OfficialUnitHeader unitId=\{unit\.id\} \/>/)
    assert.match(player, /<OfficialLessonParts lessonId=\{lesson\.id\} title=\{lesson\.title\} \/>/)
    assert.equal(player.split("lesson.id === 'F4-U3-L3'").length - 1, 2)
    assert.equal(player.split("lesson.id === 'F4-U3-L4'").length - 1, 2)
    assert.match(frame, /unit\.header\.stage\.value\.f4/)
    assert.match(frame, /<OfficialGoalChips \/>/)
    assert.match(frame, /<OfficialPartList lessonId=\{lesson\.id\} \/>/)
    assert.match(catalog, /area\.appreciate/)
    assert.match(view, /#0D9488/)
    assert.match(view, /#FFF9E9/)
    assert.equal(BANNED_GLYPH.test(view + frame), false)
    assert.equal(readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).length, 11)
    const pack = read('src/content/f6-demo.json')
    assert.match(pack, /明清美學同當代評賞比較/)
  })
})
