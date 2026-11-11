/**
 * Learning-progress report.
 * The band is the teacher-confirmed practice band only.
 * An unconfirmed draft is not a confirmed band, and the file never carries a school name.
 */
import type { PracticeBandId, TeacherDraftStore } from './teacherDraftBand.ts'
import { bandForPortfolio } from './teacherDraftBand.ts'

export const REPORT_DISCLAIMER = {
  'zh-Hant': '呢份報告係校內參考，唔係公開試正式成績。',
  'zh-Hans': '这份报告是校内参考，不是公开试正式成绩。',
  en: 'This report is an in-school reference, not an official public-exam result.',
} as const

export function confirmedPracticeBand(store: TeacherDraftStore, name: string): PracticeBandId | null {
  return bandForPortfolio(store, name)
}

export function inspectExportDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function learningProgressFilename(now = new Date()): string {
  return `learning-progress-${inspectExportDate(now).replaceAll('-', '')}`
}

export function joinRecord(lines: readonly string[]): string | null {
  const clean: string[] = []
  for (const line of lines) {
    const text = line.replace(/\s+/g, ' ').trim()
    if (!text) continue
    const short = [...text].slice(0, 80).join('')
    if (clean.includes(short)) continue
    clean.push(short)
    if (clean.length === 4) break
  }
  return clean.length ? clean.join(' · ') : null
}

export function studyForName(
  active: boolean,
  input: { completedUnitTitles: readonly string[]; artworkLines: readonly string[]; researchLines: readonly string[] },
): {
  completedUnitCount: number | null
  completedUnitTitles: string[]
  hasArtwork: boolean
  hasResearch: boolean
  artworkText: string | null
  researchText: string | null
} {
  if (!active) {
    return {
      completedUnitCount: null,
      completedUnitTitles: [],
      hasArtwork: false,
      hasResearch: false,
      artworkText: null,
      researchText: null,
    }
  }
  const artworkText = joinRecord(input.artworkLines)
  const researchText = joinRecord(input.researchLines)
  return {
    completedUnitCount: input.completedUnitTitles.length,
    completedUnitTitles: [...input.completedUnitTitles],
    hasArtwork: artworkText != null,
    hasResearch: researchText != null,
    artworkText,
    researchText,
  }
}

export type ReportRow = { label: string; value: string }

export type ReportSection = { name: string; rows: ReportRow[] }

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function renderInspectReportHtml(input: {
  lang: string
  title: string
  disclaimer: string
  sections: readonly ReportSection[]
  filename: string
}): string {
  const sections = input.sections
    .filter((section) => section.name.trim() !== '')
    .map((section) => {
      const rows = section.rows
        .map(
          (row) =>
            `<p><strong>${escapeHtml(row.label)}</strong><br>${escapeHtml(row.value).replaceAll('\n', '<br>')}</p>`,
        )
        .join('\n')
      return `<section><h2>${escapeHtml(section.name)}</h2>\n${rows}\n</section>`
    })
    .join('\n')
  return `<!DOCTYPE html>
<html lang="${escapeHtml(input.lang)}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(input.filename)}</title>
<style>
  body { margin: 24px; background: #FFF9E9; color: #1e293b; font-family: sans-serif; line-height: 1.5; }
  h1 { color: #0D9488; font-size: 1.4rem; }
  h2 { color: #0f766e; font-size: 1.1rem; }
  .disclaimer { background: #fff4e5; border: 1px solid #f6d7a8; border-radius: 12px; padding: 12px 14px; }
</style>
</head>
<body>
<p class="disclaimer">${escapeHtml(input.disclaimer)}</p>
<h1>${escapeHtml(input.title)}</h1>
${sections}
</body>
</html>
`
}
