import { t } from '../../i18n'
import {
  DEEPFOOD_PAGE_URL,
  FURTHER_CLASSROOM_VIDEOS,
  HILL_BROCHURE_URL,
  HILL_PAGE_URL,
  OVERVIEW_VIDEO_ID,
  classroomEmbedUrl,
  classroomWatchUrl,
  isCommunityCaseLesson,
} from '../../game/communityCases'

/**
 * Past official cases on the November community-art lessons.
 * YouTube is classroom playback of the official overview only.
 * Appreciation is a separate task from organiser, date, and venue.
 */
export function CommunityCases() {
  return (
    <section data-community-cases className="space-y-3">
      <HillCase />
      <DeepFoodCase />
    </section>
  )
}

export function CommunityLessonIntro({ lessonId, subtitle }: { lessonId: string; subtitle: string }) {
  if (!isCommunityCaseLesson(lessonId)) return null
  return (
    <div className="space-y-3">
      <p data-community-subtitle className="text-sm leading-relaxed text-slate-700">
        {subtitle}
      </p>
      <CommunityCases />
      <section data-visual className="space-y-1 rounded-3xl border border-[#0D9488]/40 bg-[#FFF9E9] p-4 text-sm leading-relaxed text-slate-800">
        <h3 className="text-base font-bold text-[#0D9488]">{t('visual.heading')}</h3>
        <p>{t('visual.elements.hill')}</p>
        <p>{t('visual.principles.near')}</p>
        <p>{t('visual.elements.flavour')}</p>
        <p>{t('visual.trial')}</p>
      </section>
    </div>
  )
}

function HillCase() {
  return (
    <article data-case="hill" className="space-y-1 rounded-3xl border border-[#0D9488]/40 bg-[#FFF9E9] p-4 text-sm leading-relaxed text-slate-800">
      <h3 className="text-base font-bold text-slate-900">{t('case.hill.title')}</h3>
      <p>{t('case.hill.english')}</p>
      <div data-case-source className="space-y-1">
        <p>{t('case.hill.org')}</p>
        <p>{t('case.hill.plan')}</p>
        <p>{t('case.hill.partner')}</p>
        <p>{t('case.hill.when')}</p>
        <p>{t('case.hill.where')}</p>
        <p>{t('case.hill.artist')}</p>
        <p>{t('case.hill.source')}</p>
        <p>
          <a href={HILL_PAGE_URL} className="font-semibold text-[#0D9488] underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
            {HILL_PAGE_URL}
          </a>
        </p>
        <p>
          <a href={HILL_BROCHURE_URL} className="font-semibold text-[#0D9488] underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
            {HILL_BROCHURE_URL}
          </a>
        </p>
      </div>
      <section data-appreciate className="mt-2 space-y-1 rounded-2xl border border-[#0D9488] bg-white px-3 py-2">
        <h4 className="text-sm font-bold text-[#0D9488]">{t('appreciate.heading')}</h4>
        <p>{t('case.hill.frame')}</p>
        <p>{t('case.hill.appreciate.object')}</p>
        <p>{t('case.hill.appreciate.focus')}</p>
        <p>{t('case.hill.appreciate.task')}</p>
      </section>
    </article>
  )
}

function DeepFoodCase() {
  return (
    <article data-case="deepfood" className="space-y-2 rounded-3xl border border-[#0D9488]/40 bg-[#FFF9E9] p-4 text-sm leading-relaxed text-slate-800">
      <h3 className="text-base font-bold text-slate-900">{t('case.deepfood.collective')}</h3>
      <p className="font-semibold text-slate-900">{t('case.deepfood.project')}</p>
      <p>{t('case.deepfood.english')}</p>
      <div data-case-source className="space-y-1">
        <p>{t('case.deepfood.invite')}</p>
        <p>{t('case.deepfood.venue')}</p>
        <p>{t('case.deepfood.when')}</p>
        <p>{t('case.deepfood.frame')}</p>
        <p>
          <a href={DEEPFOOD_PAGE_URL} className="font-semibold text-[#0D9488] underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
            {DEEPFOOD_PAGE_URL}
          </a>
        </p>
        <p data-video-chrome="classroom-only" className="font-semibold text-[#0D9488]">
          {t('video.classroomOnly')}
        </p>
        <p data-video-chrome="no-download">{t('video.noDownload')}</p>
        <iframe
          data-testid="classroom-video"
          data-video-id={OVERVIEW_VIDEO_ID}
          title={t('video.overviewTitle')}
          src={classroomEmbedUrl(OVERVIEW_VIDEO_ID)}
          className="aspect-video w-full rounded-2xl bg-white"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
        <p>{t('video.overviewTitle')}</p>
        <p>{t('video.channel')}</p>
        <p>{t('video.more')}</p>
        <ul className="space-y-1">
          {FURTHER_CLASSROOM_VIDEOS.map((video) => (
            <li key={video.id}>
              <a
                href={classroomWatchUrl(video.id)}
                data-video-id={video.id}
                className="font-semibold text-[#0D9488] underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {video.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <section data-appreciate className="space-y-1 rounded-2xl border border-[#0D9488] bg-white px-3 py-2">
        <h4 className="text-sm font-bold text-[#0D9488]">{t('appreciate.heading')}</h4>
        <p>{t('case.deepfood.appreciate.object')}</p>
        <p>{t('case.deepfood.appreciate.focus')}</p>
        <p>{t('case.deepfood.appreciate.task')}</p>
      </section>
    </article>
  )
}
