import { t } from '../../i18n'
import { ISLAND_CHIP, ISLAND_LINE, isQuestIsland, islandNodeState, type IslandNodeId } from '../../lib/softIslands'
import { IslandGlyph } from './SoftIllustrationMap'
import { QuestImage } from './QuestImage'

const STATE_KEY = {
  done: 'island.node.done',
  progress: 'island.node.progress',
  later: 'island.node.later',
} as const

/** Island card after a node pick. Start keeps the history path, or opens one new quest. */
export function SoftIslandFocus({
  island,
  onBack,
  onStart,
}: {
  island: IslandNodeId
  onBack: () => void
  onStart: () => void
}) {
  const state = islandNodeState(island, island)
  return (
    <section
      data-soft-plate="focus"
      data-island-focus={island}
      data-soft-motion="off"
      className="-mx-4 bg-[#FFF9E9] px-3 py-5 sm:mx-auto sm:max-w-md sm:rounded-[2rem] sm:px-5"
    >
      <h2 className="text-[1.65rem] font-bold leading-tight text-slate-900">{t('island.focus.title')}</h2>
      <p className="mt-0.5 text-sm text-slate-500">{t('island.focus.sub')}</p>
      {island === 'history' ? (
        <div className="relative mx-auto mt-4 flex h-36 w-36 items-center justify-center">
          <span className="absolute inset-2 rounded-full bg-[#d7f3ee] blur-2xl" aria-hidden />
          <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#e7f7f4] text-[#0D9488] shadow-[0_0_0_6px_#fff,0_0_0_9px_#0D9488,0_0_0_16px_rgba(13,148,136,0.16)]">
            <IslandGlyph id={island} className="h-12 w-12" />
          </span>
        </div>
      ) : null}
      <article className="mt-4 rounded-[1.35rem] border border-[#9ed9d2] bg-white px-4 py-4">
        <h3 className="text-2xl font-bold leading-tight text-slate-900">{t(ISLAND_CHIP[island])}</h3>
        <p
          data-island-status={state}
          className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
            state === 'later' ? 'bg-[#ece7df] text-slate-600' : 'bg-[#0D9488] text-[#FFF9E9]'
          }`}
        >
          {t(STATE_KEY[state])}
        </p>
        {isQuestIsland(island) ? <QuestImage id={island} /> : null}
        <p className="mt-3 text-sm font-semibold text-[#0D9488]">{t('island.focus.intro')}</p>
        <p className="mt-1 text-[15px] leading-relaxed text-slate-800">{t(ISLAND_LINE[island])}</p>
        {island === 'exam' ? (
          <p data-exam-form className="mt-2 text-sm font-semibold text-[#0D9488]">
            {t('island.exam.form')}
          </p>
        ) : null}
        <div className="mt-3 rounded-xl border border-[#f0c48a] bg-[#fde8c8] px-3 py-2.5 text-[#7a4b1a]">
          <p className="text-sm font-bold">{t('island.quest.tipTitle')}</p>
          <p className="mt-0.5 text-sm leading-relaxed">{t('island.focus.hint')}</p>
        </div>
        <button
          type="button"
          data-island-start={island}
          onClick={onStart}
          className="mt-4 min-h-12 w-full rounded-xl bg-[#0D9488] text-lg font-bold text-white hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
        >
          {t('island.focus.start')}
        </button>
      </article>
      <p className="mt-4 text-center text-sm text-slate-500">{t('island.focus.gain')}</p>
      <button
        type="button"
        data-island-back
        onClick={onBack}
        className="mt-3 block w-full text-center text-sm font-semibold text-slate-500 underline-offset-2 hover:underline"
      >
        {t('island.back')}
      </button>
    </section>
  )
}
