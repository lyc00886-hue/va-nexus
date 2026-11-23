import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  comparisonChoiceAllowed,
  lessonComparisonWorks,
  verifiedWorksFromPack,
  type AppreciationPack,
} from '../game/verifiedArtworks.ts'
import {
  inSchoolCommentForStudent,
  sanitizeTeacherComments,
  teacherCommentForSubmission,
  withTeacherComment,
} from './homeworkSubmit.ts'
import { teacherCommentText } from './inspectReport.ts'
import {
  effectivePresentation,
  presentationOverrideFor,
  sanitizePresentationOverrides,
  withPresentationOverride,
} from './lessonPresentation.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const HANT = {
  'class.staff.presentTitle': '為呢位同學設定呈現',
  'class.staff.presentHint': '可以為呢位同學設定或覆寫「標準呈現」或「易讀呈現」。學生課卡仍然只用已上線「標準呈現」「易讀呈現」「朗讀」，唔另造標籤。',
  'class.staff.presentSaved': '已為呢位同學覆寫呈現設定。',
  'hw.staff.compareTitle': '藝術評賞比較',
  'hw.staff.reviewPairIntro': '將已交作品同已核實對比作品並排睇，覆核學生評賞。',
  'hw.staff.submittedWork': '已交作品',
  'hw.staff.compareWork': '已核實對比作品',
  'hw.staff.pickCompare': '揀對比作品',
  'hw.staff.pickCompareHint': '只可以揀已核實 Public Domain 或 CC0，並且出處係 The Met、Art Institute of Chicago、Rijksmuseum、或 Wikimedia Commons 嘅作品。若呢課係評學生自己作品，先可以用校本學生作品。',
  'hw.staff.studentCritique': '學生評賞',
  'hw.staff.studentCritiqueValue': '春天早晨花園園徑同樹葉光都寫得清楚。冬天午後同一座花園，行人較密、天色偏灰。兩幅都由高處記錄環境，適合做觀察課題。',
  'hw.staff.autoCommentLabel': '自動評語',
  'hw.staff.autoCommentValue': '已交作品同評賞已交。春天同冬天兩幅花園觀察大致寫到，光同人流仍然可以再寫清楚。',
  'hw.staff.editComment': '改評語',
  'hw.staff.replaceComment': '換評語',
  'hw.staff.commentHint': '改或換之後，同一份報告路徑會見到新評語。自動評分、教師調整同確認評分仍然照舊。',
  'hw.staff.teacherCommentLabel': '教師評語',
  'hw.staff.teacherCommentValue': '評賞已寫到同一座花園喺春天早晨同冬天午後嘅分別。園徑、樹葉同行人都可以再寫清楚。',
  'inspect.evidence.title': '檢查證據',
  'inspect.evidence.intro': '呢份可列印檢查證據沿用已有預覽、輸出同列印路徑，至少包括學生作品、學生評賞、同教師評語。',
  'inspect.evidence.studentWork': '學生作品',
  'inspect.evidence.studentCritique': '學生評賞',
  'inspect.evidence.teacherComment': '教師評語',
  'report.staff.teacherComment': '教師評語',
} as const

const HANS = {
  'class.staff.presentTitle': '为这位同学设定呈现',
  'class.staff.presentHint': '可以为这位同学设定或覆写「标准呈现」或「易读呈现」。学生课卡仍然只用已上线「标准呈现」「易读呈现」「朗读」，不另造标签。',
  'class.staff.presentSaved': '已为这位同学覆写呈现设定。',
  'hw.staff.compareTitle': '艺术评赏比较',
  'hw.staff.reviewPairIntro': '将已交作品同已核实对比作品并排看，覆核学生评赏。',
  'hw.staff.submittedWork': '已交作品',
  'hw.staff.compareWork': '已核实对比作品',
  'hw.staff.pickCompare': '拣对比作品',
  'hw.staff.pickCompareHint': '只可以拣已核实 Public Domain 或 CC0，并且出处系 The Met、Art Institute of Chicago、Rijksmuseum、或 Wikimedia Commons 嘅作品。若呢课系评学生自己作品，先可以用校本学生作品。',
  'hw.staff.studentCritique': '学生评赏',
  'hw.staff.studentCritiqueValue': '春天早晨花园园径同树叶光都写得清楚。冬天午后同一座花园，行人较密、天色偏灰。两幅都由高处记录环境，适合做观察课题。',
  'hw.staff.autoCommentLabel': '自动评语',
  'hw.staff.autoCommentValue': '已交作品同评赏已交。春天同冬天两幅花园观察大致写到，光同人流仍然可以再写清楚。',
  'hw.staff.editComment': '改评语',
  'hw.staff.replaceComment': '换评语',
  'hw.staff.commentHint': '改或换之后，同一份报告路径会见到新评语。自动评分、教师调整同确认评分仍然照旧。',
  'hw.staff.teacherCommentLabel': '教师评语',
  'hw.staff.teacherCommentValue': '评赏已写到同一座花园在春天早晨同冬天午后嘅分别。园径、树叶同行人都可以再写清楚。',
  'inspect.evidence.title': '检查证据',
  'inspect.evidence.intro': '这份可打印检查证据沿用已有预览、输出同打印路径，至少包括学生作品、学生评赏、同教师评语。',
  'inspect.evidence.studentWork': '学生作品',
  'inspect.evidence.studentCritique': '学生评赏',
  'inspect.evidence.teacherComment': '教师评语',
  'report.staff.teacherComment': '教师评语',
} as const

const EN = {
  'class.staff.presentTitle': 'Set presentation for this student',
  'class.staff.presentHint': 'You can set or override Standard presentation or Easy-read presentation for this student. The student card still uses only the live labels Standard presentation, Easy-read presentation, and Read aloud. No extra label is added.',
  'class.staff.presentSaved': 'A presentation override is set for this student.',
  'hw.staff.compareTitle': 'Compare works',
  'hw.staff.reviewPairIntro': 'View the submitted work next to a verified comparison work, and review the student critique.',
  'hw.staff.submittedWork': 'Submitted work',
  'hw.staff.compareWork': 'Verified comparison work',
  'hw.staff.pickCompare': 'Choose a comparison work',
  'hw.staff.pickCompareHint': "You may only choose a verified Public Domain or CC0 work from The Met, the Art Institute of Chicago, the Rijksmuseum, or Wikimedia Commons. School student work may be used only when this lesson is about a student's own work.",
  'hw.staff.studentCritique': 'Student critique',
  'hw.staff.studentCritiqueValue': 'The spring-morning garden path and the light on the leaves are written clearly. In the winter afternoon of the same garden, there are more walkers and the sky is greyer. Both works record the place from a high view, and they suit an observation topic.',
  'hw.staff.autoCommentLabel': 'Automatic comment',
  'hw.staff.autoCommentValue': 'The submitted work and the critique were handed in. The spring and winter garden observations are mostly written, but the light and the flow of people can still be written more clearly.',
  'hw.staff.editComment': 'Edit the comment',
  'hw.staff.replaceComment': 'Replace the comment',
  'hw.staff.commentHint': 'After you edit or replace the comment, the new comment appears on the same report path. Automatic marking, teacher adjustment, and confirm-this-mark stay as they are.',
  'hw.staff.teacherCommentLabel': 'Teacher comment',
  'hw.staff.teacherCommentValue': 'The critique already names the difference between the same garden on a spring morning and on a winter afternoon. The path, the leaves, and the walkers can still be written more clearly.',
  'inspect.evidence.title': 'Inspection evidence',
  'inspect.evidence.intro': 'This printable inspection evidence uses the existing preview, export, and print path. It includes at least the student work, the student critique, and the teacher comment.',
  'inspect.evidence.studentWork': 'Student work',
  'inspect.evidence.studentCritique': 'Student critique',
  'inspect.evidence.teacherComment': 'Teacher comment',
  'report.staff.teacherComment': 'Teacher comment',
} as const

const BANNED_POINT = [0x7684, 0x628a, 0x5572, 0x4f86, 0x6765, 0x771e]
const LEAK = /SEN|Accommodated|ArtInsight|Feldman|DAIE|Duolingo|Grok|5\*\*|公開試結果|公開試預測/

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(path: string): Record<string, string> {
  return JSON.parse(read(path)) as Record<string, string>
}

describe('teacher control copy', () => {
  it('keeps the official supplement strings byte-identical', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const hans = messages('src/i18n/zh-Hans.json')
    const en = messages('src/i18n/en.json')
    const overrides = messages('src/i18n/zh-Hans.overrides.json')
    for (const key of Object.keys(HANT) as (keyof typeof HANT)[]) {
      assert.equal(hant[key], HANT[key], key)
      assert.equal(Buffer.from(hant[key], 'utf8').equals(Buffer.from(HANT[key], 'utf8')), true, key)
      assert.equal(hans[key], HANS[key], key)
      assert.equal(overrides[key], HANS[key], key)
      assert.equal(en[key], EN[key], key)
      assert.equal(LEAK.test(hant[key] + hans[key] + en[key]), false, key)
      for (const point of BANNED_POINT) {
        assert.equal([...hant[key]].some((char) => char.codePointAt(0) === point), false, `${key} U+${point.toString(16)}`)
      }
    }
    assert.equal([...hant['hw.staff.pickCompare']].some((char) => char.codePointAt(0) === 0x63c0), true)
    assert.equal(hant['hw.staff.compareTitle'], '藝術評賞比較')
    assert.equal(hans['hw.staff.compareTitle'], '艺术评赏比较')
    assert.equal(en['hw.staff.compareTitle'], 'Compare works')
    assert.equal(hant['present.standard'], '標準呈現')
    assert.equal(hant['present.easy'], '易讀呈現')
    assert.equal(hant['art.attr.pd'], 'Public Domain／CC0')
    assert.equal(hant['hw.student.uploadAndHandIn'], '上載同交功課')
    assert.equal(hant['hw.staff.saveGrade'], '確認呢次評分')
  })
})

describe('teacher control behaviour', () => {
  it('stores a per-student presentation override and applies the live mode', () => {
    assert.deepEqual(sanitizePresentationOverrides({ version: 2, rows: [] }), [])
    const saved = withPresentationOverride([], ' demo-a ', 'easy')
    assert.deepEqual(saved, [{ studentId: 'demo-a', mode: 'easy' }])
    assert.equal(presentationOverrideFor(saved, 'demo-a'), 'easy')
    assert.equal(presentationOverrideFor(saved, 'demo-b'), null)
    assert.equal(effectivePresentation(saved, 'demo-a', 'standard'), 'easy')
    assert.equal(effectivePresentation(saved, 'demo-c', 'standard'), 'standard')
    assert.equal(withPresentationOverride(saved, 'demo-a', 'easy'), saved)
    const player = read('src/components/game/LessonPlayer.tsx')
    assert.match(player, /useTeacherPresentation/)
    assert.match(player, /data-presentation=\{readingMode\}/)
    assert.match(player, /present\.standard|PresentationBar/)
    const roster = read('src/components/StudentPresentControl.tsx')
    assert.match(roster, /present\.standard/)
    assert.match(roster, /present\.easy/)
    assert.match(roster, /class\.staff\.presentTitle/)
    assert.equal(LEAK.test(roster + player), false)
  })

  it('offers only the verified Tuileries plates as comparison choices', () => {
    const pack = JSON.parse(read('src/content/f4-demo.json')) as AppreciationPack
    const works = lessonComparisonWorks(verifiedWorksFromPack(pack))
    assert.equal(works.length, 2)
    assert.equal(works[0]?.title, 'The Garden of the Tuileries on a Spring Morning')
    assert.equal(works[1]?.title, 'The Garden of the Tuileries on a Winter Afternoon')
    assert.equal(works[0]?.artist, 'Camille Pissarro')
    assert.equal(works.every((work) => comparisonChoiceAllowed(work)), true)
    assert.equal(
      comparisonChoiceAllowed({
        image: '/content/learning-map-illustrations/f4-lesson-cards/shop.jpg',
        source: 'Metropolitan Museum of Art',
      }),
      false,
    )
    assert.equal(
      comparisonChoiceAllowed({
        image: '/content/learning-map-illustrations/f4-pd/street.jpg',
        source: 'Tate',
      }),
      false,
    )
    assert.equal(
      comparisonChoiceAllowed({
        image: '/content/street-photo.jpg',
        source: 'Wikimedia Commons',
      }),
      false,
    )
    const review = read('src/components/HomeworkReview.tsx')
    assert.match(review, /hw\.staff\.compareTitle/)
    assert.match(review, /hw\.staff\.editComment/)
    assert.match(review, /hw\.staff\.replaceComment/)
    assert.match(review, /lessonComparisonWorks/)
    assert.equal(review.includes('/api/'), false)
  })

  it('keeps an edited comment for the same report and prints the three evidence pieces', () => {
    assert.deepEqual(sanitizeTeacherComments({ version: 2, comments: [] }), [])
    const saved = withTeacherComment([], ' hw-demo-a ', '  評賞已寫清楚。  ')
    assert.deepEqual(saved, [{ id: 'hw-demo-a', comment: '評賞已寫清楚。' }])
    assert.equal(teacherCommentForSubmission(saved, 'hw-demo-a'), '評賞已寫清楚。')
    assert.equal(
      inSchoolCommentForStudent(saved, [{ id: 'hw-demo-a', studentId: 'demo-a', assignmentId: 'demo' }], 'demo-a'),
      '評賞已寫清楚。',
    )
    assert.equal(teacherCommentText(true, '新評語', '自動', '未有紀錄'), '新評語')
    assert.equal(teacherCommentText(true, null, '自動', '未有紀錄'), '自動')
    assert.equal(teacherCommentText(false, '新評語', '自動', '未有紀錄'), '未有紀錄')
    const page = read('src/components/InspectReport.tsx')
    assert.match(page, /report\.staff\.teacherComment/)
    assert.match(page, /inspect\.evidence\.title/)
    assert.match(page, /inspect\.evidence\.studentWork/)
    assert.match(page, /inspect\.evidence\.studentCritique/)
    assert.match(page, /inspect\.evidence\.teacherComment/)
    assert.match(page, /inspect\.staff\.exportOne/)
    assert.match(page, /inspect\.staff\.exportClass/)
    assert.match(page, /inspect\.report\.printHint/)
    const api = readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    assert.deepEqual(api.sort(), ['class-invite.ts', 'class-shell-marks.ts', 'crop-ask.ts', 'feedback.ts', 'formative-comment.ts', 'socraticBank.ts'])
  })
})
