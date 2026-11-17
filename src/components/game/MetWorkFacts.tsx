import { getLocale, t } from '../../i18n'
import { MET_OPEN_LICENCE, MET_OPEN_SOURCE, MET_OPEN_WORKS, metOpenId } from '../../lib/metOpenWorks'

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-1 text-sm leading-relaxed text-slate-800">
      <span className="font-semibold text-[#0D9488]">{label}</span> {value}
    </p>
  )
}

/** Title, artist, year, collection, licence, and the work introduction when this file has one. */
export function MetWorkFacts({ image }: { image?: string }) {
  const id = metOpenId(image)
  const work = id ? MET_OPEN_WORKS[id] : undefined
  if (!work) return null
  const intro = work.intro?.[getLocale()]
  return (
    <figcaption data-met-work={id}>
      <Fact label={t('art.attr.title')} value={work.title} />
      <Fact label={t('art.attr.artist')} value={work.artist} />
      <Fact label={t('art.attr.year')} value={work.year} />
      <Fact label={t('art.attr.source')} value={MET_OPEN_SOURCE} />
      <Fact label={t('art.attr.license')} value={MET_OPEN_LICENCE} />
      {intro ? <Fact label={t('art.intro')} value={intro} /> : null}
    </figcaption>
  )
}
