import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { DEMO_ASSIGN_ID, F5_DEMO_ASSIGN_ID, visibleAssignment } from '../lib/assignList.ts'
import { DEMO_CLASS_ID } from '../lib/classList.ts'
import {
  assignmentsForSharedRoom,
  fileFollowKind,
  preferredHomework,
} from '../lib/homeworkSubmit.ts'
import {
  LEARNING_WORKSHEET_ASSIGN_ID,
  LEARNING_WORKSHEET_BYTES,
  LEARNING_WORKSHEET_PAGES,
  LEARNING_WORKSHEET_SHA256,
  LEARNING_WORKSHEET_URL,
  learningWorksheetAssignment,
  learningWorksheetLesson,
  withLearningWorksheet,
} from './learningWorksheet.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(import.meta.url)

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

describe('official Form 4 learning worksheet', () => {
  it('ships the original PDF bytes', async () => {
    const bytes = readFileSync(join(root, 'public/content/f4-community-art-learning-worksheet.pdf'))
    assert.equal(bytes.byteLength, LEARNING_WORKSHEET_BYTES)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), LEARNING_WORKSHEET_SHA256)
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
      require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs'),
    ).href
    const doc = await pdfjs
      .getDocument({ data: new Uint8Array(bytes), verbosity: 0, isEvalSupported: false })
      .promise
    assert.equal(doc.numPages, LEARNING_WORKSHEET_PAGES)
    let text = ''
    for (let index = 1; index <= doc.numPages; index += 1) {
      const page = await doc.getPage(index)
      const content = await page.getTextContent()
      text += content.items.map((item) => ('str' in item ? item.str : '')).join('')
    }
    await doc.destroy()
    assert.equal(text.includes('Chuen Lung'), true)
    assert.equal(text.includes('Choi Lung Tea House'), true)
    assert.equal(text.includes('\u5ddd\u2fd3'), true)
    assert.equal(text.includes('\u5f69\u2fd3\u8336\u6a13'), true)
    assert.equal(text.includes('\u9f8d'), false)
    assert.equal(text.includes('Community Art'), true)
  })

  it('keeps November homework separate and reuses the live Form 4 mark', () => {
    assert.equal(LEARNING_WORKSHEET_ASSIGN_ID === DEMO_ASSIGN_ID, false)
    assert.equal(fileFollowKind(LEARNING_WORKSHEET_ASSIGN_ID), 'f4')
    assert.equal(fileFollowKind(DEMO_ASSIGN_ID), 'f4')
    assert.equal(fileFollowKind(F5_DEMO_ASSIGN_ID), 'f5')
    const blank = visibleAssignment(learningWorksheetAssignment(DEMO_CLASS_ID), {
      title: '十一月：走進社區觀察課業',
      due: 'due',
      instructions: 'note',
    })
    assert.equal(blank.title, '')
    assert.equal(blank.due, '')
    assert.equal(blank.instructions, '')
    const november = { id: 'n', studentId: 'demo-c', assignmentId: DEMO_ASSIGN_ID }
    const worksheet = { id: 'w', studentId: 'demo-c', assignmentId: LEARNING_WORKSHEET_ASSIGN_ID }
    assert.equal(preferredHomework([worksheet, november], 'demo-c')?.id, 'n')
    const rows = withLearningWorksheet(
      [
        learningWorksheetAssignment(DEMO_CLASS_ID),
        { id: DEMO_ASSIGN_ID, classId: DEMO_CLASS_ID, title: '', due: '', instructions: '', attach: 'paper', demo: true },
      ].slice(1),
      DEMO_CLASS_ID,
    )
    assert.deepEqual(
      rows.map((row) => row.id),
      [DEMO_ASSIGN_ID, LEARNING_WORKSHEET_ASSIGN_ID],
    )
    assert.equal(withLearningWorksheet(rows, DEMO_CLASS_ID).length, rows.length)
    assert.equal(learningWorksheetLesson('F4-U3-L3'), true)
    assert.equal(learningWorksheetLesson('F4-U3-L4'), true)
    assert.equal(learningWorksheetLesson('F4-U2-L3'), false)
    assert.equal(learningWorksheetLesson('F5-U3-L1'), false)
  })

  it('opens a stored worksheet hand-in on the live room list and leaves November alone', () => {
    const novemberOnly = assignmentsForSharedRoom({
      id: 'room12345',
      members: [{ id: 'member123' }],
      submissions: [{ memberId: 'member123', assignmentId: DEMO_ASSIGN_ID, fileName: 'walk.png' }],
      assignments: [],
    })
    assert.deepEqual(
      novemberOnly.map((row) => row.id),
      [DEMO_ASSIGN_ID],
    )
    const both = assignmentsForSharedRoom({
      id: 'room12345',
      members: [{ id: 'member123' }],
      submissions: [
        { memberId: 'member123', assignmentId: DEMO_ASSIGN_ID, fileName: 'walk.png' },
        { memberId: 'member123', assignmentId: LEARNING_WORKSHEET_ASSIGN_ID, fileName: 'done.pdf' },
      ],
      assignments: [],
    })
    assert.deepEqual(
      both.map((row) => row.id),
      [DEMO_ASSIGN_ID, LEARNING_WORKSHEET_ASSIGN_ID],
    )
    assert.equal(fileFollowKind(both[1]?.id ?? ''), 'f4')
    assert.equal(
      visibleAssignment(both[1]!, { title: '十一月：走進社區觀察課業', due: 'due', instructions: 'note' }).title,
      '',
    )
  })

  it('wires the original file onto the lesson and the live hand-in path', () => {
    const player = read('src/components/game/LessonPlayer.tsx')
    const papers = read('src/components/game/LessonWorksheet.tsx')
    const student = read('src/components/HomeworkStudent.tsx')
    const staff = read('src/components/HomeworkReview.tsx')
    const file = read('src/components/game/LearningWorksheetFile.tsx')
    assert.match(player, /<LessonWorksheet lessonId=\{lesson\.id\} \/>/)
    assert.match(player, /LearningWorksheetForLesson/)
    assert.match(player, /learningWorksheetLesson\(lesson\.id\)/)
    assert.equal(papers.includes('LEARNING_WORKSHEET'), false)
    assert.equal(papers.includes(LEARNING_WORKSHEET_URL), false)
    assert.match(student, /withLearningWorksheet/)
    assert.match(student, /LEARNING_WORKSHEET_ASSIGN_ID/)
    assert.match(student, /hw\.student\.uploadAndHandIn/)
    assert.match(student, /hw\.student\.wholeFile/)
    assert.equal(student.includes("'hw.student.submit'"), false)
    assert.match(staff, /withLearningWorksheet/)
    assert.match(staff, /hw\.staff\.openFile/)
    assert.match(staff, /hw\.staff\.autoGradeLabel/)
    assert.match(staff, /hw\.staff\.adjustLabel/)
    assert.match(staff, /data-hw-pages="3"/)
    assert.match(file, /worksheet\.preview/)
    assert.match(file, /worksheet\.print/)
    assert.match(file, /worksheet\.download/)
    assert.match(file, /worksheet\.printHint/)
    assert.match(file, /data-soft-motion="off"/)
    assert.match(file, /#FFF9E9/)
    assert.match(file, /#0D9488/)
    assert.equal(file.includes('worksheet.title'), false)
    assert.equal(file.includes('hw.student.submit'), false)
    assert.equal(file.includes('>Soft<'), false)
  })
})
