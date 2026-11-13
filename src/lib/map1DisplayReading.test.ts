import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  LESSON_FONT_SCALE,
  easyReadLines,
  lessonCardBodyStyle,
  lessonCardReadingAttrs,
  lessonCardVisibleLines,
} from './lessonReadingSurface.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

const NOVEMBER = ['F4-U3-L3', 'F4-U3-L4'] as const

const TITLES = {
  'F4-U3-L3': '十一月：認識社區藝術——研究',
  'F4-U3-L4': '十一月：認識社區藝術——發展同創作',
} as const

const CARD_IMAGES: Record<(typeof NOVEMBER)[number], (string | null)[]> = {
  'F4-U3-L3': ['F4-U3-L3-c0.png', 'F4-U3-L3-c1.png', null, null, null],
  'F4-U3-L4': ['F4-U3-L4-c0.png', 'F4-U3-L4-c1.png', 'F4-U3-L4-c2.png', null, null],
}

const BANNED =
  /ArtInSight|洞察藝術|ArtGPT|Unlock the limit|評分校準|開閘|\bRELAY\b|raiders|學生面|教師面|公開試結果|公開試預測|U–5\*\*|U-5\*\*/

type RawCard = { title?: string; body?: string; image?: string; easy?: string[] }
type RawLesson = { id: string; title: string; cards: RawCard[] }

function novemberLessons(): RawLesson[] {
  const pack = JSON.parse(read('src/content/f4-demo.json')) as { units: { lessons: RawLesson[] }[] }
  return pack.units.flatMap((unit) => unit.lessons).filter((lesson) => NOVEMBER.includes(lesson.id as (typeof NOVEMBER)[number]))
}

describe('map1 display and reading on the November cards', () => {
  it('shows a visible 顯示設定 control on the map1 shell, separate from 遊戲設定', () => {
    const header = read('src/components/Header.tsx')
    const drawer = header.slice(header.indexOf('function QuestSettingsDrawer'), header.indexOf('export function Header'))
    const trigger = header.slice(header.indexOf('data-sen-trigger'), header.indexOf('<QuestGearButton'))
    assert.match(trigger, /data-display-settings=\{mapOne \? 'map1' : 'classic'\}/)
    assert.match(trigger, /aria-label=\{mapOne \? t\('sen\.quick'\) : t\('header\.a11y'\)\}/)
    assert.match(trigger, /data-testid="map1-display-settings-label">\{t\('header\.senModes'\)\}/)
    assert.equal(trigger.includes('sr-only'), false)
    assert.equal(trigger.includes('ach.gameSettings'), false)
    assert.equal(trigger.includes('遊戲設定'), false)
    assert.equal(drawer.includes('header.senModes'), false)
    assert.equal(drawer.includes('sen.quick'), false)
    assert.match(header, /QuestGearButton/)
    assert.equal(/SEN/.test(trigger), false)
    assert.equal(BANNED.test(trigger), false)

    const hant = JSON.parse(read('src/i18n/zh-Hant.json')) as Record<string, string>
    const hans = JSON.parse(read('src/i18n/zh-Hans.json')) as Record<string, string>
    const en = JSON.parse(read('src/i18n/en.json')) as Record<string, string>
    assert.equal(hant['header.senModes'], '顯示設定')
    assert.equal(hant['sen.quick'], '顯示設定')
    assert.equal(hant['sen.title'], '顯示同閱讀設定')
    assert.equal(hant['ach.gameSettings'], '遊戲設定')
    assert.equal(hant['qtype.chip.dualRead'], '藝術評賞比較')
    assert.equal(hant['qtype.chip.dualRead'].includes('雙圖對讀'), false)
    assert.equal(hans['header.senModes'], '显示设置')
    assert.equal(en['header.senModes'], 'Display settings')
    for (const bag of [hant, hans, en]) {
      assert.equal(Object.keys(bag).some((key) => key.startsWith('worksheet.')), false)
    }
  })

  it('keeps the existing display defaults and toggles, without a diagnostic SEN label', () => {
    const panel = read('src/components/SenSettingsPanel.tsx')
    const sen = read('src/context/SenContext.tsx')
    assert.match(panel, /aria-label=\{t\('sen\.title'\)\}/)
    assert.match(panel, /t\('sen\.font'\)/)
    assert.match(panel, /sen\.font\.md/)
    assert.match(panel, /t\('sen\.toggle\.dyslexia'\)/)
    assert.match(panel, /t\('support\.contrast'\)/)
    assert.match(panel, /t\('settings\.soundMotion'\)/)
    assert.match(panel, /t\('support\.reduceMotion'\)/)
    assert.match(panel, /t\('support\.focus'\)/)
    assert.match(panel, /t\('support\.readAloud'\)/)
    assert.match(panel, /t\('sen\.reset'\)/)
    assert.equal(/SEN/.test(panel), false)
    assert.equal(panel.includes('sen.preset.spld'), false)
    assert.equal(panel.includes('sen.preset.adhd'), false)
    assert.match(sen, /fontSize: 'md'/)
    assert.match(sen, /highContrast: false/)
    assert.match(sen, /dyslexia: false/)
    assert.match(sen, /readAloud: false/)
    assert.match(sen, /soundMotion: false/)
    assert.match(sen, /FONT_SCALES: Record<FontSizeLevel, number> = \{ md: 1, lg: 1\.15, xl: 1\.3 \}/)
    assert.deepEqual(LESSON_FONT_SCALE, { md: 1, lg: 1.15, xl: 1.3 })
    assert.match(sen, /--sen-font-scale/)
    assert.match(sen, /dataset\.senFont = settings\.fontSize/)
    assert.match(sen, /classList\.toggle\('sen-contrast', settings\.highContrast\)/)
    assert.match(sen, /classList\.toggle\('sen-dyslexia', settings\.dyslexia\)/)
    assert.match(read('src/game/softMotion.ts'), /SOUND_MOTION_DEFAULT = false/)
    assert.equal(readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).length, 11)
  })

  it('puts reading support, large type, loose spacing, and high contrast on the November card art and body', () => {
    const lessons = novemberLessons()
    assert.deepEqual(
      lessons.map((lesson) => lesson.id),
      [...NOVEMBER],
    )
    const on = { fontSize: 'xl' as const, dyslexia: true, highContrast: true }
    const off = { fontSize: 'md' as const, dyslexia: false, highContrast: false }
    assert.deepEqual(lessonCardReadingAttrs(off), {
      'data-lesson-card': '',
      'data-reading-support': 'off',
      'data-loose-spacing': 'off',
      'data-high-contrast': 'off',
      'data-font-size': 'md',
    })
    assert.deepEqual(lessonCardBodyStyle(off), {})
    assert.equal(LESSON_FONT_SCALE.md, 1)

    for (const lesson of lessons) {
      const id = lesson.id as (typeof NOVEMBER)[number]
      assert.equal(lesson.title, TITLES[id])
      assert.equal(lesson.cards.length, CARD_IMAGES[id].length)
      lesson.cards.forEach((card, index) => {
        assert.equal(typeof card.body, 'string')
        assert.ok(card.body && card.body.length > 0, `${id} card ${index}`)
        const file = CARD_IMAGES[id][index]
        const image = file ? `/content/learning-map-illustrations/f4-lesson-cards/${file}` : undefined
        if (image) {
          assert.equal(card.image, image)
          assert.equal(existsSync(join(root, 'public', image.slice(1))), true, image)
        } else {
          assert.equal(card.image, undefined)
        }
        const easy = card.easy?.length ? card.easy : easyReadLines(card.body ?? '')
        const attrs = lessonCardReadingAttrs(on)
        assert.equal(attrs['data-reading-support'], 'on')
        assert.equal(attrs['data-loose-spacing'], 'on')
        assert.equal(attrs['data-high-contrast'], 'on')
        assert.equal(attrs['data-font-size'], 'xl')
        assert.equal(LESSON_FONT_SCALE.xl, 1.3)
        assert.equal(LESSON_FONT_SCALE.lg, 1.15)
        const lines = lessonCardVisibleLines({ body: card.body ?? '', easy }, true)
        assert.ok(lines.length > 0)
        for (const line of lines) assert.equal((card.body ?? '').includes(line), true, line)
        assert.deepEqual(lessonCardVisibleLines({ body: card.body ?? '', easy }, false), [card.body])
        assert.deepEqual(lessonCardBodyStyle(on), {
          letterSpacing: '0.04em',
          wordSpacing: '0.16em',
          lineHeight: '1.85',
          color: '#000000',
        })
      })
    }

    const player = read('src/components/game/LessonPlayer.tsx')
    const stage = player.slice(player.indexOf('function CardsStage'), player.indexOf('function QuizStage'))
    assert.match(stage, /lessonCardReadingAttrs\(\{ fontSize, dyslexia: easyRead, highContrast \}\)/)
    assert.match(stage, /lessonCardBodyStyle\(\{ fontSize, dyslexia: easyRead, highContrast \}\)/)
    assert.match(stage, /lessonCardVisibleLines\(card, easyRead\)/)
    assert.match(stage, /LessonCardArt image=\{card\.image\} credit=\{card\.imageCredit\}/)
    assert.match(stage, /data-lesson-body/)
    assert.match(stage, /text-lg text-slate-800/)
    assert.match(stage, /text-base leading-relaxed/)
    assert.match(stage, /easyRead \? 'text-2xl' : 'text-xl'/)
    assert.equal(stage.includes('loading='), false)
    assert.match(read('src/components/game/MapOneLesson.tsx'), /lessonCardReadingAttrs\(\{ fontSize, dyslexia: easy, highContrast \}\)/)
    assert.match(read('src/game/content.ts'), /easyReadLines\(c\.body\)/)

    const css = read('src/index.css')
    assert.match(css, /font-size:\s*calc\(100% \* var\(--sen-font-scale\)\)/)
    assert.match(css, /\.sen-dyslexia \[data-lesson-card\]\[data-loose-spacing='on'\] \[data-lesson-body\]/)
    assert.match(css, /\.sen-contrast \[data-lesson-card\]\[data-high-contrast='on'\] \[data-lesson-body\]/)
    assert.match(css, /\.sen-contrast \[data-lesson-card\]\[data-high-contrast='on'\] \[data-testid='lesson-card-art'\] img/)
    assert.match(css, /outline-offset: 3px/)
    const cardCss = css.slice(css.indexOf('Lesson cards keep reading support'), css.indexOf('/* Wider spacing */'))
    assert.equal(cardCss.includes('font-size'), false)
    assert.match(css, /#FFF9E9/)
    assert.match(css, /#0D9488/)

    const art = read('src/components/game/LessonCardArt.tsx')
    assert.match(art, /key=\{image\}/)
    assert.equal(art.includes('loading='), false)
    assert.match(art, /if \(!image \|\| failed\) return null/)
  })
})
