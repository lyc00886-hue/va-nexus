import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  DEFERRED_EXERCISE_IDS,
  EXERCISE_DOC_IDS,
  EXERCISE_LOGO_DIR,
  EXERCISE_SPECS,
  MOOD_PATH_SOFT,
  exerciseIdForQuestion,
  exerciseLogoAliasSrc,
  exerciseLogoSrc,
  exerciseMarkIsIconOnly,
  isExerciseDocId,
  lessonExerciseIds,
  pathBendSide,
} from './exerciseLogos.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path)
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', path)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

const SHORT = {
  en: {
    'map.path.aria': 'Learning path',
    'ex.choice.short': 'Choice',
    'ex.match.short': 'Match',
    'ex.fill.short': 'Fill',
    'ex.image.short': 'Look',
    'ex.feldman.short': 'Appreciate',
    'ex.reflect.short': 'Reflect',
    'ex.step.short': 'Step',
  },
  'zh-Hant': {
    'map.path.aria': '學習路徑',
    'ex.choice.short': '選擇',
    'ex.match.short': '配對',
    'ex.fill.short': '填空',
    'ex.image.short': '睇圖',
    'ex.feldman.short': '評賞四步',
    'ex.reflect.short': '反思',
    'ex.step.short': '逐步',
  },
  'zh-Hans': {
    'map.path.aria': '学习路径',
    'ex.choice.short': '选择',
    'ex.match.short': '配对',
    'ex.fill.short': '填空',
    'ex.image.short': '看图',
    'ex.feldman.short': '评赏四步',
    'ex.reflect.short': '反思',
    'ex.step.short': '逐步',
  },
} as const

describe('path mood and exercise logos', () => {
  it('ships the 1024×1536 path mood and square READY logos, including the fill alias', () => {
    const mood = pngSize(join(root, 'public', MOOD_PATH_SOFT.slice(1)))
    assert.deepEqual(mood, { width: 1024, height: 1536 })

    const dir = join(root, 'public', EXERCISE_LOGO_DIR.slice(1))
    const names = readdirSync(dir).sort()
    assert.deepEqual(names, [
      'ex-appreciate.png',
      'ex-fill.png',
      'ex-image.png',
      'ex-match.png',
      'ex-mc.png',
      'ex-reflect.png',
      'ex-sba-step.png',
      'ex-short.png',
    ])
    for (const name of names) {
      assert.deepEqual(pngSize(join(dir, name)), { width: 1024, height: 1024 }, name)
    }
    for (const deferred of ['ex-order.png', 'ex-speak.png', 'ex-listen.png']) {
      assert.equal(names.includes(deferred), false, deferred)
    }
  })

  it('maps READY doc ids onto design files and keeps step icon-only', () => {
    assert.deepEqual(
      EXERCISE_SPECS.map((spec) => [spec.id, spec.file]),
      [
        ['ex.choice', 'ex-mc.png'],
        ['ex.match', 'ex-match.png'],
        ['ex.fill', 'ex-fill.png'],
        ['ex.image', 'ex-image.png'],
        ['ex.feldman', 'ex-appreciate.png'],
        ['ex.reflect', 'ex-reflect.png'],
        ['ex.step', 'ex-sba-step.png'],
      ],
    )
    assert.equal(exerciseLogoSrc('ex.choice'), `${EXERCISE_LOGO_DIR}/ex-mc.png`)
    assert.equal(exerciseLogoAliasSrc('ex.fill'), `${EXERCISE_LOGO_DIR}/ex-short.png`)
    assert.equal(exerciseLogoAliasSrc('ex.choice'), null)
    assert.equal(exerciseMarkIsIconOnly('ex.step'), true)
    assert.equal(exerciseMarkIsIconOnly('ex.feldman'), false)
    assert.equal(isExerciseDocId('ex.image'), true)
    for (const deferred of DEFERRED_EXERCISE_IDS) assert.equal(isExerciseDocId(deferred), false)

    assert.equal(exerciseIdForQuestion('mcq'), 'ex.choice')
    assert.equal(exerciseIdForQuestion('match'), 'ex.match')
    assert.equal(exerciseIdForQuestion('fill'), 'ex.fill')
    assert.equal(exerciseIdForQuestion('order'), null)
    assert.equal(exerciseIdForQuestion('speak'), null)
    assert.equal(exerciseIdForQuestion('listen'), null)
  })

  it('collects marks that exist on a lesson and ignores deferred ids', () => {
    assert.deepEqual(
      lessonExerciseIds({
        questions: [{ type: 'fill' }, { type: 'mcq' }, { type: 'mcq' }, { type: 'match' }],
      }),
      ['ex.choice', 'ex.match', 'ex.fill'],
    )
    assert.deepEqual(
      lessonExerciseIds({
        questions: [{ type: 'mcq' }],
        artists: [{ artistId: 'WEST-KAHLO-01' }],
        embedFeldman: true,
        exerciseIds: ['ex.reflect', 'ex.step', 'speak', 'order', 'nope'],
      }),
      ['ex.choice', 'ex.image', 'ex.feldman', 'ex.reflect', 'ex.step'],
    )
    assert.deepEqual(lessonExerciseIds({ artists: [] }), [])
    assert.deepEqual(EXERCISE_DOC_IDS.includes('ex.step'), true)
    assert.equal(pathBendSide(0), 'right')
    assert.equal(pathBendSide(1), 'left')
    assert.equal(pathBendSide(2), 'right')
  })

  it('uses the path as map chrome and the short names, without opening SBA or motion v2', () => {
    const map = readFileSync(join(root, 'src/components/game/LearningMap.tsx'), 'utf8')
    const path = readFileSync(join(root, 'src/components/game/MapPath.tsx'), 'utf8')
    const mark = readFileSync(join(root, 'src/components/game/ExerciseMark.tsx'), 'utf8')
    const player = readFileSync(join(root, 'src/components/game/LessonPlayer.tsx'), 'utf8')
    const one = readFileSync(join(root, 'src/components/game/MapOneLesson.tsx'), 'utf8')
    const feldman = readFileSync(join(root, 'src/components/FeldmanWriter.tsx'), 'utf8')
    const sba = readFileSync(join(root, 'src/components/SbaQuest.tsx'), 'utf8')
    const ability = readFileSync(join(root, 'src/components/AbilityChart.tsx'), 'utf8')

    assert.match(map, /data-map-chrome="path"/)
    assert.match(map, /title=\{node\.title\}/)
    assert.equal(map.includes('<MapFold'), false)
    assert.match(path, /MOOD_PATH_SOFT/)
    assert.match(path, /lessonExerciseIds/)
    assert.match(path, /aria-label=\{t\('map\.path\.aria'\)\}/)
    assert.match(mark, /exerciseMarkIsIconOnly/)
    assert.match(player, /ExerciseMark/)
    assert.match(one, /ExerciseMark/)
    assert.match(feldman, /ex\.feldman/)
    assert.equal(sba.includes('exerciseLogos'), false)
    assert.equal(sba.includes('ex-sba-step'), false)
    assert.equal(ability.includes('exerciseLogos'), false)
    assert.equal(path.includes('moods/motion-v2'), false)
    assert.equal(/streak|hearts|FOMO|\bXP\b|\bLv\./.test(path + mark), false)

    const files = {
      en: 'src/i18n/en.json',
      'zh-Hant': 'src/i18n/zh-Hant.json',
      'zh-Hans': 'src/i18n/zh-Hans.json',
    } as const
    for (const locale of Object.keys(files) as (keyof typeof files)[]) {
      const bag = JSON.parse(readFileSync(join(root, files[locale]), 'utf8')) as Record<string, string>
      for (const [key, value] of Object.entries(SHORT[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
        assert.equal(/SEN|診斷|诊断|XP|FOMO/.test(value), false, key)
      }
    }
  })
})
