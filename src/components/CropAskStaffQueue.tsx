import { useState } from 'react'
import { useT, type MessageKey } from '../i18n'
import {
  pendingReviewCount,
  reviewDrafts,
  staffNeedsNames,
  staffUsesDemo,
  type CropAskAxis,
  type CropAskReview,
  type CropRect,
} from '../lib/cropAsk'
import { useInspectClassStore } from '../lib/inspectClass'
import { GRADE_LABEL } from '../lib/softGoMaps'
import { confirmCropAsk, saveCropAskTeacherEdit, unconfirmCropAsk, useCropAskStore } from '../lib/useCropAsk'
import { CropAskDisclaimer } from './CropAskWork'

const AXIS_LABEL: Record<CropAskAxis, MessageKey> = {
  theme: 'inspect.axis.theme',
  research: 'inspect.axis.research',
  media: 'inspect.axis.media',
  process: 'inspect.axis.process',
  reflect: 'inspect.axis.reflect',
  visual: 'inspect.axis.visual',
}

const DEMO_LABEL: Record<'a' | 'b' | 'c', MessageKey> = {
  a: 'inspect.demo.a',
  b: 'inspect.demo.b',
  c: 'inspect.demo.c',
}

const STATUS_LABEL: Record<CropAskReview['status'], MessageKey> = {
  pending: 'cropask.status.pending',
  edited: 'cropask.status.edited',
  confirmed: 'cropask.status.confirmed',
}

function regionStyle(crop: CropRect): { width: string; height: string; left: string; top: string } {
  return {
    width: `${100 / crop.w}%`,
    height: `${100 / crop.h}%`,
    left: `${(-crop.x / crop.w) * 100}%`,
    top: `${(-crop.y / crop.h) * 100}%`,
  }
}

export function CropAskStaffQueue() {
  const { t } = useT()
  const store = useCropAskStore()
  const roster = useInspectClassStore()
  const rows = reviewDrafts(store)
  const pending = pendingReviewCount(store)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [seen, setSeen] = useState('')
  const [understood, setUnderstood] = useState('')
  const [evidence, setEvidence] = useState('')
  const [regionOnly, setRegionOnly] = useState(false)
  const demo = staffUsesDemo(roster.students, rows)
  const noNames = staffNeedsNames(roster.students, rows)
  const open = rows.find((row) => row.id === openId) ?? null

  function openRow(row: CropAskReview) {
    setOpenId(row.id)
    setEditing(false)
    setRegionOnly(false)
    setSeen(row.sections.seen)
    setUnderstood(row.sections.understood)
    setEvidence(row.sections.evidence)
  }

  return (
    <section data-testid="crop-ask-staff" className="rounded-3xl border-2 border-[#0D9488] bg-[#FFF9E9] p-4 sm:p-6">
      <h2 className="text-xl font-bold text-slate-900">{t('cropask.staff.blockTitle')}</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">{t('cropask.staff.intro')}</p>
      {demo ? (
        <p data-testid="crop-ask-demo-note" className="mt-2 text-sm font-semibold text-[#0D9488]">
          {t('cropask.staff.demoNote')}
        </p>
      ) : null}
      {pending > 0 ? <p className="mt-2 text-sm font-semibold text-slate-800">{t('cropask.staff.count', { pending })}</p> : null}
      {noNames ? <p className="mt-3 text-sm text-slate-700">{t('cropask.staff.noNames')}</p> : null}
      {rows.length === 0 ? <p className="mt-3 text-sm text-slate-700">{t('cropask.staff.empty')}</p> : null}
      <ul className="mt-4 space-y-3">
        {rows.map((row) => {
          const expanded = open?.id === row.id
          const name = row.demoId ? t(DEMO_LABEL[row.demoId]) : row.studentKey
          return (
            <li key={row.id} data-testid={`crop-ask-staff-card-${row.id}`} className="rounded-3xl border border-[#0D9488]/40 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">{t('cropask.staff.student')}</p>
              <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
                <p className="text-base font-bold text-slate-900">{name}</p>
                <button type="button" className="rounded-full border border-[#0D9488] px-3 py-1 text-sm font-semibold text-[#0D9488]" onClick={() => (expanded ? setOpenId(null) : openRow(row))}>
                  {expanded ? t('cropask.back') : t('cropask.staff.viewRegion')}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full border border-[#0D9488] px-2 py-0.5 text-xs font-semibold text-[#0D9488]">{t(GRADE_LABEL[row.grade])}</span>
                <span className="rounded-full bg-[#0D9488] px-2 py-0.5 text-xs font-semibold text-white">{t('cropask.unitLabel')}</span>
                <span className="font-semibold text-slate-900">{row.unitTitle}</span>
                <span className="rounded-full bg-[#FFF4D6] px-2 py-0.5 text-xs font-semibold text-amber-950">{t(STATUS_LABEL[row.status])}</span>
              </div>
              {row.status === 'confirmed' && !expanded ? (
                <div className="mt-3">
                  <CropAskDisclaimer />
                </div>
              ) : null}
              {expanded ? (
                <div className="mt-4 space-y-3">
                  <CropAskDisclaimer />
                  <p className="text-sm leading-relaxed text-slate-700">
                    {row.status === 'confirmed' ? t('cropask.confirmedNote') : t('cropask.pendingNote')}
                  </p>
                  {row.imageDataUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-[#0D9488]/40">
                      {regionOnly && row.crop ? (
                        <div className="relative h-48 overflow-hidden">
                          <img src={row.imageDataUrl} alt="" className="absolute max-w-none" style={regionStyle(row.crop)} />
                        </div>
                      ) : (
                        <div className="relative">
                          <img src={row.imageDataUrl} alt="" className="block h-auto w-full" />
                          {row.crop ? (
                            <div
                              className="pointer-events-none absolute border-2 border-[#0D9488]"
                              style={{
                                left: `${row.crop.x * 100}%`,
                                top: `${row.crop.y * 100}%`,
                                width: `${row.crop.w * 100}%`,
                                height: `${row.crop.h * 100}%`,
                              }}
                            />
                          ) : null}
                        </div>
                      )}
                      {row.crop ? (
                        <button type="button" className="m-2 rounded-full bg-[#0D9488] px-3 py-1 text-xs font-semibold text-white" onClick={() => setRegionOnly((value) => !value)}>
                          {t('cropask.staff.viewRegion')}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {editing ? (
                    <div className="space-y-3">
                      <Field label={t('cropask.section.seen')} hint={t('cropask.section.seenHint')} value={seen} onChange={setSeen} />
                      <Field label={t('cropask.section.understood')} hint={t('cropask.section.understoodHint')} value={understood} onChange={setUnderstood} />
                      <Field label={t('cropask.section.evidence')} hint={t('cropask.section.evidenceHint')} value={evidence} onChange={setEvidence} />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                          disabled={!seen.trim() || !understood.trim() || !evidence.trim()}
                          onClick={() => {
                            saveCropAskTeacherEdit(row.id, { seen, understood, evidence })
                            setEditing(false)
                          }}
                        >
                          {t('cropask.staff.saveEdit')}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488]"
                          onClick={() => {
                            setSeen(row.sections.seen)
                            setUnderstood(row.sections.understood)
                            setEvidence(row.sections.evidence)
                            setEditing(false)
                          }}
                        >
                          {t('cropask.staff.cancelEdit')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <ReadSection title={t('cropask.section.seen')} body={row.sections.seen} />
                      <ReadSection title={t('cropask.section.understood')} body={row.sections.understood} />
                      <ReadSection title={t('cropask.section.evidence')} body={row.sections.evidence} />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{t('cropask.axisHint')}</p>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {row.axes.map((id) => (
                            <li key={id} className="rounded-full border border-[#0D9488] px-3 py-1 text-sm text-[#0D9488]">
                              {t(AXIS_LABEL[id])}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488]"
                          onClick={() => {
                            setSeen(row.sections.seen)
                            setUnderstood(row.sections.understood)
                            setEvidence(row.sections.evidence)
                            setEditing(true)
                          }}
                        >
                          {t('cropask.staff.edit')}
                        </button>
                        {row.status === 'confirmed' ? (
                          <button
                            type="button"
                            className="rounded-full border border-[#0D9488] bg-white px-4 py-2 text-sm font-semibold text-[#0D9488]"
                            onClick={() => unconfirmCropAsk(row.id)}
                          >
                            {t('cropask.staff.unconfirm')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            data-testid="crop-ask-confirm"
                            className="rounded-full bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white"
                            onClick={() => confirmCropAsk(row.id)}
                          >
                            {t('cropask.staff.confirm')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ReadSection({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl border border-[#0D9488]/30 bg-white px-4 py-3">
      <h3 className="font-bold text-[#0D9488]">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-800">{body}</p>
    </section>
  )
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm font-semibold text-slate-900">
      {label}
      <span className="mt-1 block font-normal text-slate-600">{hint}</span>
      <textarea
        value={value}
        maxLength={500}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
      />
    </label>
  )
}
