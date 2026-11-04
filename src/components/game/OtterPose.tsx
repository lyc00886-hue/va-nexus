import { getBadgeById } from '../../game/rewards'
import { OTTER_SRC, otterEnterMs, type OtterEnter, type OtterPoseId } from '../../game/otterMascot'
import { t } from '../../i18n'
import { ChestOpenFrame } from './SoftMotion'

const SIZE = {
  sm: { px: 96, className: 'h-16 w-16' },
  md: { px: 176, className: 'h-36 w-36' },
} as const

/**
 * One static otter pose. Step fades are ≤200ms; celebrate enter is 500ms.
 * Reduce-motion renders the pose immediately and does not loop.
 */
export function OtterPose({
  pose,
  label,
  reduceMotion,
  enter = 'step',
  size = 'md',
  testId,
}: {
  pose: OtterPoseId
  label: string
  reduceMotion: boolean
  enter?: OtterEnter
  size?: keyof typeof SIZE
  testId: string
}) {
  const ms = otterEnterMs(reduceMotion, enter)
  const box = SIZE[size]
  return (
    <figure
      data-testid={testId}
      data-pose={pose}
      data-otter-enter={ms === 0 ? 'instant' : enter}
      className={`otter-pose flex shrink-0 flex-col items-center gap-1 ${size === 'sm' ? 'w-20' : ''}`}
      style={
        ms === 0
          ? undefined
          : { animation: `${enter === 'celebrate' ? 'otter-celebrate-in' : 'otter-step-in'} ${ms}ms ease-out both` }
      }
    >
      <img
        src={OTTER_SRC[pose]}
        alt=""
        width={box.px}
        height={box.px}
        className={`${box.className} rounded-3xl bg-[#FFF9E9] object-contain`}
        decoding="async"
      />
      <figcaption className={`text-center font-bold text-[#0D9488] ${size === 'sm' ? 'text-xs leading-tight' : 'text-sm'}`}>
        {label}
      </figcaption>
    </figure>
  )
}

/** Optional one-chest celebrate. Open reveals ＋10 learning points and any new achievements. Later removes it. */
export function OtterChest({
  reduceMotion,
  play = false,
  opened,
  badgeIds,
  onOpen,
  onSkip,
}: {
  reduceMotion: boolean
  /** Gear opt-in. The open frame stays static when this is false. */
  play?: boolean
  opened: boolean
  badgeIds: readonly string[]
  onOpen: () => void
  onSkip: () => void
}) {
  const rewardMs = otterEnterMs(reduceMotion || !play, 'celebrate')
  const badges = badgeIds.map((id) => ({ id, title: getBadgeById().get(id)?.title ?? id }))
  return (
    <section
      data-testid="otter-chest"
      aria-label={t('mascot.chest')}
      className="mt-5 rounded-3xl border border-[#0D9488]/20 bg-[#FFF9E9] px-5 py-6 text-center"
    >
      {opened ? (
        <ChestOpenFrame play={play && !reduceMotion} />
      ) : (
        <OtterPose
          pose="chest"
          label={t('mascot.chest')}
          reduceMotion={reduceMotion || !play}
          enter="step"
          testId="otter-pose-chest"
        />
      )}
      {opened ? (
        <div
          className="otter-celebrate mt-3"
          data-testid="otter-chest-reward"
          data-otter-enter={rewardMs === 0 ? 'instant' : 'celebrate'}
          role="status"
          style={
            rewardMs === 0 ? undefined : { animation: `otter-celebrate-in ${rewardMs}ms ease-out both` }
          }
        >
          <p className="text-base font-bold text-[#0D9488]">{t('mascot.chest.reward')}</p>
          {badges.length > 0 ? (
            <ul data-testid="otter-chest-badges" className="mt-2 space-y-1 text-sm text-slate-800">
              {badges.map((badge) => (
                <li key={badge.id}>{badge.title}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center">
          <button
            type="button"
            data-testid="otter-chest-open"
            onClick={onOpen}
            className="w-full rounded-2xl bg-[#0D9488] py-3.5 text-base font-bold text-white hover:bg-[#0f766e]"
          >
            {t('mascot.chest.cta')}
          </button>
          <button
            type="button"
            data-testid="otter-chest-skip"
            onClick={onSkip}
            className="mt-3 min-h-11 text-sm font-semibold text-slate-500 underline-offset-2 hover:underline"
          >
            {t('mascot.chest.skip')}
          </button>
        </div>
      )}
    </section>
  )
}
