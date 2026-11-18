import { t } from '../../i18n'

const BODY = 'text-lg leading-relaxed text-slate-900'

/** Student-facing appreciation notes. Education Bureau 2024 directions, with no coined method name. */
export function CritiqueFace({ lessonId, objectText }: { lessonId: string; objectText: string }) {
  return (
    <div
      data-classroom-face="critique"
      data-critique-lesson={lessonId}
      className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
    >
      <h3 className="text-xl font-bold leading-relaxed text-slate-900">{t('critique.title')}</h3>
      <div className="mt-3 space-y-3">
        <p className={BODY}>{t('critique.lead')}</p>
        <p className={BODY}>{t('critique.flex')}</p>
        <p className={BODY}>{objectText}</p>
        <p className={BODY}>{t('critique.nudge')}</p>
      </div>
    </div>
  )
}

/** Rules shown before a blocked image search. Homemade art is not offered as the appreciation object. */
export function ImageRuleFace() {
  return (
    <div data-classroom-face="rule" className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-4">
      <h3 className="text-xl font-bold leading-relaxed text-slate-900">{t('image.ruleTitle')}</h3>
      <div className="mt-3 space-y-3">
        <p className={BODY}>{t('image.rule')}</p>
        <p className={BODY}>{t('image.sources')}</p>
        <p className={BODY}>{t('image.homemade')}</p>
        <p className={BODY}>{t('image.school')}</p>
        <p className={BODY}>{t('image.noStandIn')}</p>
        <p className={BODY}>{t('image.examples')}</p>
        <p className={BODY}>{t('image.tate')}</p>
      </div>
    </div>
  )
}

/** Empty frame when a work is not verified Public Domain or CC0. The artist and the image stay off the card. */
export function ImageBlockedFace() {
  return (
    <div data-classroom-face="blocked" className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-4">
      <h3 className="text-xl font-bold leading-relaxed text-slate-900">{t('image.blockedTitle')}</h3>
      <div className="mt-3 flex min-h-40 items-center justify-center rounded-2xl border-2 border-slate-200 bg-[#FFF9E9] px-4 py-8 text-center text-sm font-semibold text-slate-500">
        {t('image.empty')}
      </div>
      <div className="mt-3 space-y-3">
        <p className={BODY}>{t('image.blocked')}</p>
        <p className={BODY}>{t('image.rule')}</p>
        <p className={BODY}>{t('image.sources')}</p>
        <p className={BODY}>{t('image.homemade')}</p>
        <p className={BODY}>{t('image.school')}</p>
        <p className={BODY}>{t('image.noStandIn')}</p>
      </div>
    </div>
  )
}
