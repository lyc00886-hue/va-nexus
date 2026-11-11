import { useState } from 'react'
import { useT } from '../../i18n'
import { useResearchStepsShell } from '../../lib/useResearchStepsShell'
import { useResearchToolFace } from '../../lib/useResearchToolFace'
import { CropAskEntry } from '../CropAskEntry'
import { FeldmanWriter } from '../FeldmanWriter'

/**
 * Look closely and Feldman four-step writing, side by side.
 * No extra product name. The same block is used from quest and classic,
 * because both open this research lab and the same two draft stores.
 */
export function ResearchToolPair() {
  const { t } = useT()
  const steps = useResearchStepsShell()
  const face = useResearchToolFace()
  const [panel, setPanel] = useState<'look' | 'write' | null>(null)
  return (
    <section data-research-pair data-soft-motion="off" className="rounded-3xl border-2 border-[#0D9488] bg-[#FFF9E9] p-4 sm:p-5">
      <p className="text-sm leading-relaxed text-slate-700">{t('research.pair.hint')}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <article className="flex flex-col rounded-2xl border border-[#0D9488]/40 bg-white p-4">
          <h3 className="text-lg font-bold text-[#0D9488]">{t('cropask.title')}</h3>
          <button
            type="button"
            data-testid="crop-ask-start"
            disabled={!face}
            onClick={() => setPanel('look')}
            className="mt-4 w-fit rounded-full bg-[#0D9488] px-4 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488] disabled:opacity-40"
          >
            {t('cropask.entry.cta')}
          </button>
        </article>
        <article className="flex flex-col rounded-2xl border border-[#0D9488]/40 bg-white p-4">
          <h3 className="text-lg font-bold text-[#0D9488]">{t('fw.title')}</h3>
          <button
            type="button"
            data-testid="research-pair-write"
            onClick={() => setPanel('write')}
            className="mt-4 w-fit rounded-full bg-[#0D9488] px-4 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
          >
            {t('research.pair.writingCta')}
          </button>
        </article>
      </div>
      {panel === 'look' && face ? (
        <CropAskEntry
          grade={face.grade}
          unit={{ id: face.id, title: face.title }}
          onClose={() => setPanel(null)}
          onOpenWriting={() => setPanel('write')}
        />
      ) : null}
      {panel === 'write' ? (
        <div className="mt-4 rounded-3xl border border-[#0D9488]/30 bg-white p-4">
          <FeldmanWriter shell={steps ? 'steps' : undefined} onLookClosely={() => setPanel('look')} />
        </div>
      ) : null}
    </section>
  )
}
