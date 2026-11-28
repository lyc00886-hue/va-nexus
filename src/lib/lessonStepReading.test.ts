import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { easyReadLines } from './lessonReadingSurface.ts'
import { READING_DEFAULTS, applyReadingPreset } from './readingSettings.ts'
import {
  beginGestureAutoRead,
  readGestureAutoRead,
  stopGestureAutoRead,
} from './gestureAutoRead.ts'
import {
  bilingualSpeech,
  gestureSpeakTiming,
  openingCardSpeech,
  planAutoRead,
  planGestureAutoRead,
  readAloudFace,
  releaseOwnsSpeech,
  speechNeedsCancel,
  spokenCardText,
} from './lessonStepReading.ts'

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

describe('auto-read starts a critique step and stop holds', () => {
  it('starts when a critique step opens after a question, and does not restart that step', () => {
    const question = planAutoRead({
      auto: true,
      autoKey: 'L-q-2',
      text: 'Compare works',
      armedKey: undefined,
      stoppedKey: undefined,
    })
    assert.equal(question.start, true)
    assert.equal(question.arm, 'L-q-2')
    const critique = planAutoRead({
      auto: true,
      autoKey: 'L-critique-2',
      text: '評賞提示',
      armedKey: question.arm,
      stoppedKey: undefined,
    })
    assert.equal(critique.start, true)
    assert.equal(critique.arm, 'L-critique-2')
    const again = planAutoRead({
      auto: true,
      autoKey: 'L-critique-2',
      text: '評賞提示',
      armedKey: critique.arm,
      stoppedKey: undefined,
    })
    assert.equal(again.start, false)
  })

  it('does not start when auto-read is off, the line is empty, or the student already stopped that step', () => {
    assert.equal(
      planAutoRead({ auto: false, autoKey: 'L-critique-2', text: '評賞提示', armedKey: undefined, stoppedKey: undefined }).start,
      false,
    )
    assert.equal(
      planAutoRead({ auto: true, autoKey: 'L-critique-2', text: '   ', armedKey: undefined, stoppedKey: undefined }).start,
      false,
    )
    assert.equal(
      planAutoRead({
        auto: true,
        autoKey: 'L-critique-2',
        text: '評賞提示',
        armedKey: undefined,
        stoppedKey: 'L-critique-2',
      }).start,
      false,
    )
  })

  it('lets a newer reader keep speech when an older reader unmounts', () => {
    assert.equal(releaseOwnsSpeech(2, 1), false)
    assert.equal(releaseOwnsSpeech(2, 2), true)
    assert.equal(releaseOwnsSpeech(0, 0), false)
  })

  it('starts the first teaching card, and stop on that card does not restart it', () => {
    const first = planAutoRead({
      auto: true,
      autoKey: 'F4-U3-L2-card-0',
      text: '社區觀察：由環境搵主題。課堂觀察',
      armedKey: undefined,
      stoppedKey: undefined,
    })
    assert.equal(first.start, true)
    assert.equal(first.arm, 'F4-U3-L2-card-0')
    const dropped = planAutoRead({
      auto: true,
      autoKey: 'F4-U3-L2-card-0',
      text: '社區觀察：由環境搵主題。課堂觀察',
      armedKey: undefined,
      stoppedKey: undefined,
    })
    assert.equal(dropped.start, true)
    const held = planAutoRead({
      auto: true,
      autoKey: 'F4-U3-L2-card-0',
      text: '社區觀察：由環境搵主題。課堂觀察',
      armedKey: first.arm,
      stoppedKey: 'F4-U3-L2-card-0',
    })
    assert.equal(held.start, false)
    const next = planAutoRead({
      auto: true,
      autoKey: 'F4-U3-L2-card-1',
      text: '創作可以同社區有關',
      armedKey: first.arm,
      stoppedKey: 'F4-U3-L2-card-0',
    })
    assert.equal(next.start, true)
  })

  it('does not cancel an idle synth before the first teaching card speaks', () => {
    assert.equal(speechNeedsCancel({ speaking: false, pending: false }), false)
    assert.equal(speechNeedsCancel({ speaking: true, pending: false }), true)
    assert.equal(speechNeedsCancel({ speaking: false, pending: true }), true)
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
    assert.match(media, /auto=\{autoRead\}/)
    assert.match(media, /autoKey=\{autoKey\}/)
    assert.equal(quiz.includes('<ReadingBar'), false)
    assert.match(
      player,
      /autoKey=\{critiqueOpen \? `\$\{lesson\.id\}-critique-\$\{stepIdx\}` : `\$\{lesson\.id\}-q-\$\{stepIdx\}`\}/,
    )
    assert.match(player, /readText=\{critiqueOpen \? critiqueRead : questionRead\}/)
    assert.match(player, /auto=\{settings\.readAloud\}/)
    assert.match(player, /autoKey=\{`\$\{lesson\.id\}-card-\$\{cardIdx\}`\}/)
    assert.match(read('src/lib/useSpeech.ts'), /speechNeedsCancel/)
    assert.match(read('src/components/game/ReadAloudButton.tsx'), /onstart: \(\) => \{\s*armed\.current = arm/)
    assert.match(read('src/components/game/ReadAloudButton.tsx'), /planAutoRead/)
    assert.match(read('src/components/game/ReadAloudButton.tsx'), /stopped\.current = autoKey/)
    assert.match(read('src/lib/useSpeech.ts'), /releaseOwnsSpeech/)
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

const DRAW_BODY = '寫生由觀察開始：先睇整體形狀同比例，再加細節，唔好一開始就抄陰影。'

describe('讀寫支援 starts the open card in the click', () => {
  const card = {
    title: '重點 1',
    body: DRAW_BODY,
    easy: easyReadLines(DRAW_BODY),
  }

  function opening(readingEasy: boolean) {
    return openingCardSpeech({
      lessonId: 'F4-U2-L1',
      cards: [card],
      questionCount: 6,
      media: false,
      readingEasy,
      bilingual: false,
      sep: '。',
    })
  }

  it('speaks the first drawing card when auto-read is on, and stays quiet when it is off', () => {
    const supported = opening(true)
    assert.ok(supported)
    assert.equal(supported.key, 'F4-U2-L1-card-0')
    assert.equal(supported.text, spokenCardText({ ...card, readingEasy: true, bilingual: false, sep: '。' }))
    assert.equal(supported.text.includes('先睇整體形狀同比例'), true)
    assert.equal(supported.text.includes(DRAW_BODY), false)
    const plain = opening(false)
    assert.equal(plain?.text, `重點 1。${DRAW_BODY}`)
    assert.equal(
      planGestureAutoRead({ auto: true, key: supported.key, text: supported.text }).speak,
      true,
    )
    assert.equal(
      planGestureAutoRead({ auto: false, key: supported.key, text: supported.text }).speak,
      false,
    )
    assert.equal(
      planGestureAutoRead({ auto: true, key: supported.key, text: '   ', stoppedKey: undefined }).speak,
      false,
    )
    assert.equal(
      planGestureAutoRead({
        auto: true,
        key: supported.key,
        text: supported.text,
        stoppedKey: supported.key,
      }).speak,
      false,
    )
    assert.equal(openingCardSpeech({ ...{
      lessonId: 'F4-U3-L3',
      cards: [card],
      questionCount: 1,
      media: true,
      readingEasy: true,
      bilingual: false,
      sep: '。',
    } }), null)

    const spld = applyReadingPreset(READING_DEFAULTS, 'spld')
    const quiet = applyReadingPreset(READING_DEFAULTS, 'lowSensory')
    assert.equal(spld.readAloud, true)
    assert.equal(spld.dyslexia, true)
    assert.equal(quiet.readAloud, false)
    assert.equal(quiet.dyslexia, false)
    assert.equal(READING_DEFAULTS.readAloud, false)
    assert.equal(planGestureAutoRead({ auto: spld.readAloud, key: supported.key, text: supported.text }).speak, true)
    assert.equal(planGestureAutoRead({ auto: quiet.readAloud, key: plain?.key ?? '', text: plain?.text ?? '' }).speak, false)
    assert.equal(
      planGestureAutoRead({ auto: READING_DEFAULTS.readAloud, key: plain?.key ?? '', text: plain?.text ?? '' }).speak,
      false,
    )
  })

  it('shows the short stop label as soon as the open click has spoken', () => {
    assert.equal(readAloudFace({ speaking: false, gestureLive: true }), 'stop')
    assert.equal(readAloudFace({ speaking: true, gestureLive: false }), 'stop')
    assert.equal(readAloudFace({ speaking: false, gestureLive: false }), 'read')
    assert.equal(gestureSpeakTiming(false), 'now')
    assert.equal(gestureSpeakTiming(true), 'after-cancel')

    stopGestureAutoRead()
    const spoken: string[] = []
    const started = beginGestureAutoRead(
      { auto: true, key: 'F4-U2-L1-card-0', text: '重點 1。先睇整體形狀同比例' },
      (text) => {
        spoken.push(text)
        return true
      },
    )
    assert.equal(started, true)
    assert.deepEqual(spoken, ['重點 1。先睇整體形狀同比例'])
    assert.equal(readGestureAutoRead()?.phase, 'starting')
    assert.equal(readAloudFace({ speaking: false, gestureLive: true }), 'stop')
    const again = beginGestureAutoRead(
      { auto: true, key: 'F4-U2-L1-card-0', text: '重點 1。先睇整體形狀同比例' },
      () => {
        spoken.push('again')
        return true
      },
    )
    assert.equal(again, true)
    assert.deepEqual(spoken, ['重點 1。先睇整體形狀同比例'])
    const quiet = beginGestureAutoRead({ auto: false, key: 'F4-U2-L1-card-0', text: '唔好讀' }, () => {
      spoken.push('quiet')
      return true
    })
    assert.equal(quiet, false)
    assert.equal(spoken.length, 1)
    stopGestureAutoRead('F4-U2-L1-card-0')
    assert.equal(readGestureAutoRead(), null)
    const refused = beginGestureAutoRead({ auto: true, key: 'F4-U2-L1-card-0', text: '再試' }, () => false)
    assert.equal(refused, false)
    assert.equal(readGestureAutoRead(), null)
    let hooks: { onstart?: () => void; onend?: () => void; onerror?: (reason?: string) => void } | undefined
    const held = beginGestureAutoRead({ auto: true, key: 'F4-U2-L1-card-0', text: '重點 1' }, (_text, next) => {
      hooks = next
      return true
    })
    assert.equal(held, true)
    hooks?.onerror?.('synthesis-failed')
    hooks?.onend?.()
    assert.equal(readGestureAutoRead()?.phase, 'starting')
    assert.equal(readAloudFace({ speaking: false, gestureLive: true }), 'stop')
    hooks?.onstart?.()
    assert.equal(readGestureAutoRead()?.phase, 'speaking')
    hooks?.onend?.()
    assert.equal(readGestureAutoRead(), null)
    stopGestureAutoRead()
  })

  it('keeps the open-click wiring, the short stop label, and a quiet low-sensory preset', () => {
    const button = read('src/components/game/ReadAloudButton.tsx')
    const quest = read('src/components/game/MapQuest.tsx')
    const speech = read('src/lib/useSpeech.ts')
    const panel = read('src/components/SenSettingsPanel.tsx')
    const player = read('src/components/game/LessonPlayer.tsx')
    const gesture = speech.slice(speech.indexOf('export function speakDuringGesture'), speech.indexOf('export function useSpeech'))
    assert.match(player, /spokenCardText\(/)
    assert.match(quest, /onLesson=\{openQuestLesson\}/)
    assert.match(quest, /beginGestureAutoRead\(\s*\{ auto: settings\.readAloud, key: opening\.key, text: opening\.text \},\s*speakDuringGesture,\s*\)/)
    assert.match(quest, /stopGestureAutoRead\(\)/)
    assert.match(button, /gestureSessionOwns\(autoKey\) \|\| gestureAttempted\(autoKey\)/)
    assert.match(button, /readAloudFace\(\{ speaking: tts\.speaking, gestureLive \}\)/)
    assert.match(button, /const label = face === 'stop' \? t\('tts\.stop'\) : t\('tts\.read'\)/)
    assert.match(button, /data-read-label=\{face\}/)
    assert.equal(button.includes('停止朗讀'), false)
    assert.match(gesture, /gestureSpeakTiming\(busy\) === 'now'\) run\(\)/)
    assert.match(gesture, /synth\.speak\(u\)/)
    assert.equal(gesture.includes('voicesReady'), false)
    assert.match(panel, /preset\.id === 'spld'\) primeSpeechEngine\(\)/)
    assert.equal(panel.includes('speakDuringGesture'), false)
    assert.equal(JSON.parse(read('src/i18n/zh-Hant.json'))['tts.stop'], '停止')
    assert.equal(JSON.parse(read('src/i18n/zh-Hant.json'))['tts.read'], '朗讀')
  })
})
