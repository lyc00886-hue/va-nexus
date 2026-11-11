/**
 * Builds the class work list from the roster, in-school answers, and records already on this device.
 * Map, artwork, and research readings attach only to the active in-school name.
 */
import { useMemo } from 'react'
import { useGame } from '../context/GameContext'
import { getF4Units } from '../game/f4Demo'
import { getF5Units } from '../game/f5Demo'
import { getF6Units } from '../game/f6Demo'
import { getResearchQuests } from '../game/research'
import { contentJson } from '../i18n/content'
import { joinList, useT, type MessageKey } from '../i18n'
import { loadLocalNotes } from './sbaEvidence'
import { loadSbaArtworkSlots } from './sbaArtworkSlots'
import { GRADE_LABEL } from './softGoMaps'
import { useSchoolScoreLater } from './useSchoolScoreLater'
import { useTeacherDraftStore } from './useTeacherDraftStore'
import {
  inspectDisplayName,
  sortWorkList,
  statusForStudent,
  useInspectClassStore,
  type InspectStatus,
} from './inspectClass'
import {
  attemptsFor,
  parseInspectBank,
  summarizePractice,
  useInspectPracticeStore,
  type InspectBank,
  type InspectGrade,
} from './inspectPractice'
import { confirmedPracticeBand, inspectExportDate, studyForName } from './inspectReport'
import { portfolioKey, type PracticeBandId } from './teacherDraftBand'

export type InspectView = {
  id: string
  name: string
  demo: boolean
  grade: InspectGrade | null
  manualAttention: boolean
  status: InspectStatus
  done: number
  total: number
  units: string
  mcScore: string
  written: string
  artwork: string
  research: string
  band: string
  date: string
}

const BAND_LABEL: Record<PracticeBandId, MessageKey> = {
  'practice-emerging': 'score.v1.band.emerging',
  'practice-developing': 'score.v1.band.developing',
  'practice-secure': 'score.v1.band.secure',
  'practice-strong': 'score.v1.band.strong',
}

function bankFor(grade: InspectGrade): InspectBank | null {
  return parseInspectBank(contentJson(grade === 'f4' ? 'inspect-f4' : grade === 'f5' ? 'inspect-f5' : 'inspect-f6'))
}

function completedTitles(grade: InspectGrade, completed: ReadonlySet<string>): string[] {
  const units = grade === 'f5' ? getF5Units() : grade === 'f6' ? getF6Units() : getF4Units()
  return units
    .filter((unit) => unit.nodes.length > 0 && unit.nodes.every((node) => completed.has(node.id)))
    .map((unit) => unit.title)
}

export function useInspectRows(): InspectView[] {
  const { t } = useT()
  const roster = useInspectClassStore()
  const practice = useInspectPracticeStore()
  const drafts = useTeacherDraftStore()
  const game = useGame()
  const later = useSchoolScoreLater()
  const activeName = portfolioKey(drafts.activePortfolio)
  const demoA = t('inspect.demo.a')
  const demoB = t('inspect.demo.b')
  const demoC = t('inspect.demo.c')

  return useMemo(() => {
    const demoNames = { a: demoA, b: demoB, c: demoC }
    const completed = new Set(
      Object.entries(game.state.nodes)
        .filter(([, node]) => node?.completed)
        .map(([id]) => id),
    )
    const slotCopy = contentJson<{ slots: Record<string, { short?: string }> }>('sba-artwork-slots')
    const slots = loadSbaArtworkSlots()
    const notes = loadLocalNotes()
    const artworkLines: string[] = []
    for (const id of [1, 2, 3, 4] as const) {
      const typed = slots.types[id] != null
      const evidence = Object.values(slots.evidenceSlots).includes(id)
      if (typed || evidence) {
        const label = slotCopy.slots?.[String(id)]?.short
        if (label) artworkLines.push(label)
      }
    }
    for (const page of later.draft?.pages ?? []) {
      if (page.side === 'artwork') artworkLines.push(page.fileName)
    }
    for (const note of notes) {
      if (note.note) artworkLines.push(note.note)
    }
    const researchLines: string[] = []
    for (const page of later.draft?.pages ?? []) {
      if (page.side === 'research_workbook') researchLines.push(page.fileName)
    }
    for (const quest of getResearchQuests()) {
      if (game.state.quests[quest.id]?.completed) researchLines.push(quest.title)
    }

    const date = inspectExportDate()
    const none = t('inspect.report.none')
    const unset = t('inspect.report.unsetBand')
    const missingLabel = t('inspect.status.missing')
    const drafted = roster.students.map((student) => {
      const name = inspectDisplayName(student, demoNames)
      const active = portfolioKey(name) === activeName && activeName !== ''
      const titles = active && student.grade ? completedTitles(student.grade, completed) : []
      const study = studyForName(active, { completedUnitTitles: titles, artworkLines, researchLines })
      const bank = student.grade ? bankFor(student.grade) : null
      const summary = summarizePractice(bank, attemptsFor(practice, name))
      const band = confirmedPracticeBand(drafts, name)
      return {
        id: student.id,
        name,
        demo: student.demoId != null,
        grade: student.grade,
        manualAttention: student.manualAttention,
        done: summary.submitted,
        total: summary.total,
        study,
        summary,
        band,
      }
    })
    const views = drafted.map((row, index) => {
      const othersCompletedUnits = drafted.some((other, otherIndex) => otherIndex !== index && (other.study.completedUnitCount ?? 0) > 0)
      const status = statusForStudent({
        grade: row.grade,
        submitted: row.done,
        total: row.total,
        manualAttention: row.manualAttention,
        completedUnitCount: row.study.completedUnitCount,
        othersCompletedUnits,
        hasArtwork: row.study.hasArtwork,
        hasResearch: row.study.hasResearch,
        hasConfirmedBand: row.band != null,
      })
      const bandLabel = row.band ? t(BAND_LABEL[row.band]) : unset
      return {
        id: row.id,
        name: row.name,
        demo: row.demo,
        grade: row.grade,
        manualAttention: row.manualAttention,
        status,
        done: row.done,
        total: row.total,
        units: row.study.completedUnitTitles.length ? joinList(row.study.completedUnitTitles) : none,
        mcScore: row.grade ? t('inspect.report.mcScore', { correct: row.summary.mcCorrect, total: row.summary.mcTotal }) : missingLabel,
        written: row.grade ? t('inspect.report.written', { done: row.summary.writtenDone, total: row.summary.writtenTotal }) : missingLabel,
        artwork: row.study.artworkText ?? none,
        research: row.study.researchText ?? none,
        band: bandLabel,
        date,
      }
    })
    return sortWorkList(views)
  }, [activeName, demoA, demoB, demoC, drafts, game.state.nodes, game.state.quests, later.draft, practice, roster.students, t])
}

export function gradeLabelKey(grade: InspectGrade): MessageKey {
  return GRADE_LABEL[grade]
}
