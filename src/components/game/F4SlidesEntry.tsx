import { BiKey } from './BilingualText'

/** Official Form 4 demo deck. External link only. The address is the target, not a title. */
export const F4_DEMO_SLIDES_URL = 'https://gamma.app/docs/-il0yjfxm1yuw5gd'

/** One shell entry. Callers show it on the Form 4 shell only, never inside a lesson card. */
export function F4SlidesEntry() {
  return (
    <section data-f4-slides="entry" className="rounded-3xl border-2 border-[#0D9488] bg-white px-4 py-3">
      <h2 className="text-base font-bold text-[#0D9488]">
        <BiKey name="lesson.slides.label" />
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        <BiKey name="lesson.slides.hint" />
      </p>
      <a
        href={F4_DEMO_SLIDES_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-9 items-center rounded-full border border-[#0D9488] bg-white px-3 py-1 text-sm font-semibold text-[#0D9488] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488]"
      >
        <BiKey name="lesson.slides.open" />
      </a>
    </section>
  )
}
