import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { bilingualSpeech } from './lessonStepReading.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

describe('bilingual speech for an open lesson step', () => {
  it('keeps one language as one line', () => {
    assert.equal(bilingualSpeech('課堂', 'Lesson', false, '。'), '課堂')
    assert.equal(bilingualSpeech('Lesson', 'Lesson', true, '. '), 'Lesson')
    assert.equal(bilingualSpeech('課堂', '  ', true, '。'), '課堂')
    assert.equal(bilingualSpeech('課堂', undefined, true, '。'), '課堂')
  })

  it('reads English then the active Chinese line when both differ', () => {
    assert.equal(bilingualSpeech('藝術評賞比較', 'Compare works', true, '。'), 'Compare works。藝術評賞比較')
    assert.equal(bilingualSpeech('艺术评赏比较', 'Compare works', true, '。'), 'Compare works。艺术评赏比较')
  })
})

describe('inclusive learning settings on the student entrance', () => {
  const player = read('src/components/game/LessonPlayer.tsx')
  const css = read('src/index.css')
  const timer = read('src/components/FocusTunnel.tsx')
  const hant = JSON.parse(read('src/i18n/zh-Hant.json')) as Record<string, string>
  const hans = JSON.parse(read('src/i18n/zh-Hans.json')) as Record<string, string>
  const en = JSON.parse(read('src/i18n/en.json')) as Record<string, string>

  it('shows the current lesson step when focus is on, and keeps the 25-minute timer above the lesson', () => {
    assert.match(player, /focus=\{focusTunnel\}/)
    assert.equal(player.includes('focus={false}'), false)
    assert.equal(player.includes('ring-amber-200'), false)
    assert.match(player, /data-focus-tunnel=\{focusTunnel \? 'on' : 'off'\}/)
    assert.match(player, /data-focus-step=\{focusTunnel \? 'current' : undefined\}/)
    assert.match(player, /data-lesson-extra/)
    assert.match(css, /\.sen-focus \[data-lesson-wizard\] \[data-lesson-step\]:not\(\[data-focus-step='current'\]\)/)
    assert.match(css, /\.sen-focus \[data-lesson-wizard\] \[data-lesson-extra\]/)
    assert.match(timer, /const FOCUS_SECONDS = 25 \* 60/)
    assert.match(timer, /data-focus-timer/)
    assert.match(timer, /createPortal\(timer, document\.body\)/)
    assert.match(timer, /z-\[60\]/)
    assert.match(css, /html\[data-lesson-wizard='on'\] \[data-focus-timer\]/)
    assert.match(read('src/App.tsx'), /<FocusTunnel \/>/)
    assert.match(read('src/components/game/LearningMap.tsx'), /focusTunnel && current/)
    assert.match(read('src/game/softMotion.ts'), /SOUND_MOTION_DEFAULT = false/)
    assert.equal(player.includes('soundMotion: true'), false)
    assert.equal(player.includes("update('soundMotion'"), false)
    assert.match(player, /const primaryDisabled = phase === 'quiz' && !feedback && !gateReady && !licenceFace/)
  })

  it('auto-reads teaching, media, question, and critique steps and keeps the manual control', () => {
    const media = player.slice(player.indexOf('function MediaStage'), player.indexOf('function questionSpeech'))
    const quiz = player.slice(player.indexOf('function QuizStage'), player.indexOf('function RestStage'))
    const critique = player.slice(player.indexOf('critiqueOpen ?'), player.indexOf('function CardsStage'))
    assert.match(media, /auto=\{autoRead\}/)
    assert.match(media, /autoKey=\{autoKey\}/)
    assert.match(quiz, /auto=\{autoRead\}/)
    assert.match(quiz, /autoKey=\{autoKey\}/)
    assert.match(critique, /auto=\{settings\.readAloud\}/)
    assert.match(critique, /autoKey=\{`\$\{lesson\.id\}-critique-\$\{stepIdx\}`\}/)
    assert.match(player, /autoKey=\{`\$\{lesson\.id\}-card-\$\{cardIdx\}`\}/)
    assert.match(player, /autoKey=\{`\$\{lesson\.id\}-q-\$\{stepIdx\}`\}/)
    assert.match(read('src/components/game/PresentationBar.tsx'), /<ReadAloudButton text=\{readText\} auto=\{auto\} autoKey=\{autoKey\} pill \/>/)
    assert.match(read('src/components/game/ReadAloudButton.tsx'), /t\('tts\.stop'\)/)
    assert.match(read('src/components/game/ReadAloudButton.tsx'), /t\('tts\.read'\)/)
    assert.equal(hant['tts.read'], '朗讀')
    assert.equal(hant['support.readAloud'], '自動朗讀')
    assert.equal(hant['qtype.chip.dualRead'], '藝術評賞比較')
    assert.equal(hans['qtype.chip.dualRead'], '艺术评赏比较')
    assert.equal(en['qtype.chip.dualRead'], 'Compare works')
  })

  it('scales map chrome, lesson body, and on-screen homework text from the root rem step', () => {
    assert.match(css, /font-size:\s*calc\(100% \* var\(--sen-font-scale\)\)/)
    assert.match(css, /html\[data-sen-font='lg'\] \.quest-band-label/)
    assert.match(css, /\.sen-dyslexia \[data-quest-map\] \.quest-label/)
    assert.match(css, /\.sen-dyslexia \[data-worksheet-paper\]/)
    assert.match(css, /\.sen-dyslexia \[data-testid='hw-student-joined'\]/)
    assert.match(css, /\.sen-contrast \[data-worksheet-paper\]/)
    assert.match(player, /text-xl leading-relaxed/)
    assert.match(read('src/components/game/MapQuestChrome.tsx'), /text-sm/)
    assert.match(read('src/components/game/MapQuestChrome.tsx'), /text-xs/)
    assert.equal(/text-\[\d+px\]/.test(read('src/components/game/LessonWorksheet.tsx')), false)
    assert.equal(/text-\[\d+px\]/.test(read('src/components/HomeworkStudent.tsx')), false)
    assert.equal(/text-\[\d+px\]/.test(read('src/components/game/LessonPlayer.tsx')), false)
    assert.match(css, /\[data-testid='lesson-card-art'\] figcaption/)
    assert.match(css, /font-size: 0\.6875rem/)
    assert.match(read('src/components/game/BilingualText.tsx'), /text-\[0\.625rem\]/)
    assert.match(read('src/game/lessonWorksheet.ts'), /h1 \{ font-size: 20px; \}/)
    assert.match(read('src/components/game/LearningWorksheetFile.tsx'), /LEARNING_WORKSHEET_URL/)
    assert.equal(hant['support.largeText'], '大字')
    assert.equal(hant['support.largeText.desc'], '全站字體放大')
    assert.equal(hant['support.focus.desc'], '一次只顯示一張卡，附專注計時')
    assert.equal(hant['sen.toggle.focus.desc'], '一次只顯示一個步驟，附 25 分鐘專注計時')
    assert.equal(hant['sen.toggle.read.desc'], '打開短課卡時自動讀出內容（可隨時停止）')
    assert.equal(css.includes('#FFF9E9'), true)
    assert.equal(css.includes('#0D9488'), true)
  })
})
