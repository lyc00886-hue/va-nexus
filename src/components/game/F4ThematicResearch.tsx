import { t } from '../../i18n'
import {
  lessonCardBodyStyle,
  lessonCardReadingAttrs,
  lessonCardVisibleLines,
  type LessonFontStep,
} from '../../lib/lessonReadingSurface'
import type { Lesson } from '../../game/types'
import { LessonCardArt } from './LessonCardArt'

const THEMATIC_LESSON = 'F4-U3-L3'

/**
 * Slice ① reading frame for the November research lesson only.
 * The paired lesson title stays visible. Its unit line and continue image stay unwired.
 */
export function F4ThematicResearch({
  lesson,
  fontSize,
  easyRead,
  highContrast,
}: {
  lesson: Lesson
  fontSize: LessonFontStep
  easyRead: boolean
  highContrast: boolean
}) {
  if (lesson.id !== THEMATIC_LESSON) return null

  const researchTitle = t('lesson.f4u3l3.title')
  const makingTitle = t('lesson.f4u3l4.title')
  const message = t('unit.f4u3.themeMessage')
  const added = t('image.added.caption')
  const strands = [
    ['knowledge', t('unit.f4u3.strand.knowledge.label'), t('unit.f4u3.strand.knowledge')],
    ['appreciate', t('unit.f4u3.strand.appreciate.label'), t('unit.f4u3.strand.appreciate')],
    ['create', t('unit.f4u3.strand.create.label'), t('unit.f4u3.strand.create')],
  ] as const

  return (
    <div data-thematic-lesson={THEMATIC_LESSON} className="space-y-4">
      <section data-thematic-unit="F4-U3" className="space-y-3">
        <p className="inline-flex rounded-full bg-[#0D9488] px-3 py-1.5 text-sm font-semibold text-white">
          {t('unit.thematic.label')}
        </p>
        <h2 className="text-xl font-bold text-slate-900">
          {t('unit.f4u3.theme.label')}：{t('unit.f4u3.theme')}
        </h2>
        <ThemeMessage label={t('unit.f4u3.themeMessage.label')} body={message} />
        <LessonCardArt image={t('image.path.themeUnit')} credit={added} />
        <div className="grid grid-cols-2 gap-3">
          <LessonLink title={titleTail(researchTitle)} full={researchTitle} />
          <LessonLink title={titleTail(makingTitle)} full={makingTitle} />
        </div>
        <p className="text-sm leading-relaxed text-slate-800">{t('unit.f4u3.connect')}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {strands.map(([id, label, body]) => (
            <article key={id} data-strand={id} className="rounded-2xl border border-[#0D9488] bg-white p-3">
              <h3 className="text-sm font-bold text-[#0D9488]">{label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-800">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section data-thematic-start={THEMATIC_LESSON} className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">{researchTitle}</h2>
        <p className="text-sm leading-relaxed text-slate-800">{t('lesson.f4u3l3.unitLine')}</p>
        <ThemeMessage label={`${t('unit.f4u3.themeMessage.label')} · ${t('unit.thematic.label')}`} body={message} />
        <LessonCardArt image={lesson.coverImage} credit={t('image.keep.caption')} />
        <p data-thematic-subtitle className="text-sm leading-relaxed text-slate-800">
          {t('lesson.f4u3l3.subtitle')}
        </p>
        <LessonCardArt image={t('image.path.lived')} credit={added} />
      </section>

      <section data-thematic-research={THEMATIC_LESSON} className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[#0D9488] bg-white px-3 py-1.5 text-sm font-semibold text-[#0D9488]">
            {t('unit.f4u3.strand.knowledge.label')}
          </span>
          <span className="rounded-full border border-[#0D9488] bg-white px-3 py-1.5 text-sm font-semibold text-[#0D9488]">
            {t('unit.f4u3.strand.appreciate.label')}
          </span>
        </div>
        <LessonCardArt image={t('image.path.research')} credit={added} />
        <div className="space-y-3">
          {lesson.cards.map((card, index) => {
            const lines = lessonCardVisibleLines(card, easyRead)
            const bodyStyle = lessonCardBodyStyle({ fontSize, dyslexia: easyRead, highContrast })
            return (
              <article
                key={`${card.title}-${index}`}
                data-research-card={index}
                data-research-art={card.image ? 'keep' : 'text'}
                {...lessonCardReadingAttrs({ fontSize, dyslexia: easyRead, highContrast })}
                className="rounded-3xl border border-[#0D9488]/70 bg-white p-4"
              >
                <h3 className="text-base font-bold text-slate-900">{card.title}</h3>
                <LessonCardArt image={card.image} credit={card.imageCredit} />
                {easyRead ? (
                  <ul data-lesson-body className="mt-3 space-y-2 text-lg text-slate-800" style={bodyStyle}>
                    {lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p data-lesson-body className="mt-3 text-base leading-relaxed text-slate-700" style={bodyStyle}>
                    {lines[0]}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function ThemeMessage({ label, body }: { label: string; body: string }) {
  return (
    <section className="rounded-2xl border border-[#0D9488] bg-white px-4 py-3">
      <h3 className="text-sm font-bold text-[#0D9488]">{label}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-800">{body}</p>
    </section>
  )
}

function LessonLink({ title, full }: { title: string; full: string }) {
  return (
    <article className="rounded-2xl border border-[#0D9488] bg-white p-3">
      <h3 className="text-sm font-bold text-[#0D9488]">{title}</h3>
      <p className="mt-1 text-sm font-semibold leading-snug text-slate-900">{full}</p>
    </article>
  )
}

function titleTail(title: string): string {
  const pair = '\u2014\u2014'
  const at = title.lastIndexOf(pair)
  if (at >= 0) return title.slice(at + pair.length).trim()
  const one = title.lastIndexOf('\u2014')
  if (one >= 0) return title.slice(one + 1).trim()
  return title
}
