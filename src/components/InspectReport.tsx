import { useEffect } from 'react'
import { HTML_LANG, useT } from '../i18n'
import { gradeLabelKey, useInspectRows, type InspectView } from '../lib/useInspectClass'
import { useHomeworkSubmissions } from '../lib/homeworkSubmit'
import {
  collectedReportValue,
  learningProgressFilename,
  renderInspectReportHtml,
  studentHomeworkCollected,
  type ReportSection,
} from '../lib/inspectReport'

export type InspectPreview = { kind: 'one'; id: string } | { kind: 'class' }

function sectionFor(
  row: InspectView,
  labels: Record<string, string>,
  gradeText: string,
  extra: { homework: string; note: string; bandKeep: string; noteHint: string },
): ReportSection {
  return {
    name: row.name,
    rows: [
      { label: labels.student, value: row.name },
      { label: labels.grade, value: gradeText },
      { label: labels.units, value: row.units },
      { label: labels.practice, value: `${row.mcScore}\n${row.written}` },
      { label: labels.artwork, value: row.artwork },
      { label: labels.research, value: row.research },
      { label: labels.band, value: `${row.band}\n${extra.bandKeep}` },
      { label: labels.homework, value: extra.homework },
      { label: labels.note, value: `${extra.note}\n${extra.noteHint}` },
      { label: labels.date, value: row.date },
    ],
  }
}

export function InspectReport({ preview, onClose }: { preview: InspectPreview | null; onClose: () => void }) {
  const { t, locale } = useT()
  const rows = useInspectRows()
  const submissions = useHomeworkSubmissions()
  const shown = preview?.kind === 'class' ? rows : rows.filter((row) => row.id === preview?.id)

  function collectionFor(row: InspectView): { homework: string; note: string } {
    const collected = studentHomeworkCollected(submissions, row.id)
    return {
      homework: collectedReportValue(collected, t('report.staff.homeworkValue'), t('inspect.report.none')),
      note: collectedReportValue(collected, t('report.staff.noteValue'), t('inspect.report.none')),
    }
  }

  useEffect(() => {
    if (!preview) return
    document.getElementById('inspect-report')?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [preview])

  function download(list: InspectView[]) {
    const labels = {
      student: t('inspect.report.student'),
      grade: t('inspect.report.grade'),
      units: t('inspect.report.units'),
      practice: t('inspect.report.practice'),
      artwork: t('inspect.report.artwork'),
      research: t('inspect.report.research'),
      band: t('inspect.report.band'),
      homework: t('report.staff.homework'),
      note: t('report.staff.note'),
      date: t('inspect.report.date'),
    }
    const bandKeep = t('report.staff.bandKeep')
    const noteHint = t('report.staff.noteHint')
    const sections = list
      .filter((row) => row.name.trim() !== '')
      .map((row) =>
        sectionFor(row, labels, row.grade ? t(gradeLabelKey(row.grade)) : t('inspect.report.none'), {
          ...collectionFor(row),
          bandKeep,
          noteHint,
        }),
      )
    const filename = learningProgressFilename()
    const html = renderInspectReportHtml({
      lang: HTML_LANG[locale],
      title: t('report.staff.title'),
      disclaimer: t('inspect.report.disclaimer'),
      sections,
      filename,
    })
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.html`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const one = preview?.kind === 'one' ? shown[0] : undefined

  return (
    <section id="inspect-report" aria-labelledby="inspect-report-title" data-testid="inspect-report" data-soft-motion="off" className="space-y-4 rounded-[2rem] bg-[#FFF9E9] p-4 sm:p-5">
      <div>
        <h2 id="inspect-report-title" data-testid="report-staff-title" className="text-xl font-bold text-slate-900">
          {t('report.staff.title')}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('report.staff.intro')}</p>
      </div>

      {preview && shown.length > 0 ? (
        <article data-testid="inspect-report-preview" className="rounded-3xl border-2 border-[#0D9488] bg-white p-4">
          <p role="note" data-testid="inspect-report-disclaimer" className="rounded-2xl border border-amber-200 bg-[#fff4e5] px-4 py-3 text-sm leading-relaxed text-amber-950">
            {t('inspect.report.disclaimer')}
          </p>
          <div className="mt-4 space-y-6">
            {shown.map((row) => {
              const collection = collectionFor(row)
              return (
              <div key={row.id}>
                <h3 className="text-base font-bold text-[#0D9488]">{row.name}</h3>
                <dl className="mt-2 space-y-2 text-sm">
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.student')}</dt>
                    <dd>{row.name}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.grade')}</dt>
                    <dd>{row.grade ? t(gradeLabelKey(row.grade)) : t('inspect.report.none')}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.units')}</dt>
                    <dd>{row.units}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.practice')}</dt>
                    <dd>{row.mcScore}</dd>
                    <dd>{row.written}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.artwork')}</dt>
                    <dd>{row.artwork}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.research')}</dt>
                    <dd>{row.research}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.band')}</dt>
                    <dd data-testid={`inspect-band-${row.id}`}>{row.band}</dd>
                    <p data-testid={`report-band-keep-${row.id}`} className="mt-1 text-sm leading-relaxed text-slate-600">
                      {t('report.staff.bandKeep')}
                    </p>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('report.staff.homework')}</dt>
                    <dd data-testid={`report-homework-${row.id}`}>{collection.homework}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('report.staff.note')}</dt>
                    <dd data-testid={`report-note-${row.id}`}>{collection.note}</dd>
                    <p data-testid={`report-note-hint-${row.id}`} className="mt-1 text-sm leading-relaxed text-slate-600">
                      {t('report.staff.noteHint')}
                    </p>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">{t('inspect.report.date')}</dt>
                    <dd>{row.date}</dd>
                  </div>
                </dl>
              </div>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              {t('inspect.staff.closePreview')}
            </button>
            <button
              type="button"
              data-testid="inspect-export-one"
              disabled={!one}
              onClick={() => {
                if (one) download([one])
              }}
              className="rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {t('inspect.staff.exportOne')}
            </button>
            <button
              type="button"
              data-testid="inspect-export-class"
              disabled={preview.kind !== 'class'}
              onClick={() => download(rows)}
              className="rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488] disabled:opacity-40"
            >
              {t('inspect.staff.exportClass')}
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-600">{t('inspect.report.printHint')}</p>
        </article>
      ) : null}
    </section>
  )
}
