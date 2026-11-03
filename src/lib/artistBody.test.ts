import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  EN_BODY_PENDING,
  artistFields,
  artistReadText,
  pairFields,
  type ArtistBodySource,
} from './artistBody.ts'

const HAN = /\p{Script=Han}/u

const ZH = {
  sba_theme_tags: ['都市疏離', '現代孤獨', '室內光影'],
  formal_traits: '幾何窗框、冷暖對比、簡化寫實',
  dse_concept: '用深夜餐廳的玻璃隔閡表現現代疏離',
  spld_summary: '美國畫家。畫深夜餐廳，用大玻璃窗同光暗表現孤獨',
  origin: '油畫',
} satisfies ArtistBodySource

function assertNoHan(value: string, label: string) {
  assert.equal(HAN.test(value), false, `${label} still has Chinese: ${value}`)
}

describe('artistFields English', () => {
  it('uses Hopper, Pak, and Ai English body text and never the Chinese source', () => {
    const hopper = artistFields(
      {
        ...ZH,
        sba_theme_tags_en: ['urban alienation', 'modern loneliness', 'interior light'],
        formal_traits_en: 'Geometric window frames, strong warm-cool contrast, simplified realism',
        dse_concept_en:
          'Uses the glass barrier of a late-night diner to show modern alienation and failed communication',
        spld_summary_en:
          'American painter. He painted a late-night diner, using big glass windows and light and dark to show loneliness',
        origin_en: 'Oil painting',
      },
      'en',
    )
    assert.deepEqual(hopper.themes, ['urban alienation', 'modern loneliness', 'interior light'])
    assert.deepEqual(hopper.style_keywords, [
      'Geometric window frames',
      'strong warm-cool contrast',
      'simplified realism',
    ])
    assert.equal(hopper.medium, 'Oil painting')
    assert.match(hopper.bio_short ?? '', /^American painter/)
    assert.equal(hopper.spld_summary, hopper.bio_short)
    for (const value of [hopper.medium, hopper.bio_short, hopper.dse_concept, hopper.spld_summary, ...hopper.themes, ...hopper.style_keywords]) {
      assert.ok(value)
      assertNoHan(value, 'Hopper')
    }

    const pak = artistFields(
      {
        ...ZH,
        sba_theme_tags: ['城市空間', '日常現成物', '壓迫感'],
        spld_summary: '香港藝術家。用透明膠袋收集屋內空氣',
        origin: '觀念／混合媒介',
        sba_theme_tags_en: ['urban space', 'everyday ready-mades', 'pressure'],
        formal_traits_en: 'Everyday clear plastic bags, measuring space with the body, minimal process records',
        dse_concept_en: 'Collects the air of a whole flat, making the pressure of cramped housing physical',
        spld_summary_en:
          'Hong Kong artist. He filled clear plastic bags with the air of a flat to show how crowded homes are',
        origin_en: 'Conceptual / mixed media',
      },
      'en',
    )
    assert.deepEqual(pak.themes, ['urban space', 'everyday ready-mades', 'pressure'])
    assert.match(pak.bio_short ?? '', /plastic bags/)
    assert.equal(pak.medium, 'Conceptual / mixed media')
    assert.equal(HAN.test([pak.medium, pak.bio_short, ...pak.themes].join(' ')), false)

    const ai = artistFields(
      {
        ...ZH,
        sba_theme_tags: ['社會介入', '政治批判', '大量重複'],
        origin: '裝置／觀念',
        sba_theme_tags_en: ['social engagement', 'political critique', 'mass repetition'],
        formal_traits_en: 'Masses of handmade replicas, altered ready-mades, documentary film',
        dse_concept_en: 'Uses art as a tool for social engagement and political critique',
        spld_summary_en: 'Chinese artist. He uses art to speak about society and criticise politics',
        origin_en: 'Installation and conceptual art',
      },
      'en',
    )
    assert.deepEqual(ai.themes, ['social engagement', 'political critique', 'mass repetition'])
    assert.equal(ai.medium, 'Installation and conceptual art')
    assert.match(ai.bio_short ?? '', /^Chinese artist/)
    assert.equal(HAN.test([ai.medium, ai.bio_short, ...ai.themes, ...ai.style_keywords].join(' ')), false)
  })

  it('shows the pending placeholder when an English value is missing or blank', () => {
    const blank = artistFields(
      {
        ...ZH,
        sba_theme_tags_en: ['  ', ''],
        formal_traits_en: '   ',
        dse_concept_en: '',
        spld_summary_en: null,
        origin_en: '  ',
      },
      'en',
    )
    assert.deepEqual(blank.themes, [EN_BODY_PENDING])
    assert.deepEqual(blank.style_keywords, [EN_BODY_PENDING])
    assert.equal(blank.medium, EN_BODY_PENDING)
    assert.equal(blank.bio_short, EN_BODY_PENDING)
    assert.equal(blank.dse_concept, EN_BODY_PENDING)
    assert.equal(blank.spld_summary, EN_BODY_PENDING)
    const dumped = JSON.stringify(blank)
    assert.equal(dumped.includes('油畫'), false)
    assert.equal(dumped.includes('都市疏離'), false)
    assert.equal(dumped.includes('美國畫家'), false)

    const missing = artistFields(ZH, 'en')
    assert.equal(missing.medium, EN_BODY_PENDING)
    assert.deepEqual(missing.themes, [EN_BODY_PENDING])
    assert.equal(missing.bio_short, EN_BODY_PENDING)
  })

  it('keeps a real English concept when only the summary is missing', () => {
    const row = artistFields(
      {
        ...ZH,
        dse_concept_en: 'Uses the glass barrier of a late-night diner',
        spld_summary_en: '',
        origin_en: 'Oil painting',
        sba_theme_tags_en: ['urban alienation'],
        formal_traits_en: 'Geometric window frames',
      },
      'en',
    )
    assert.equal(row.spld_summary, EN_BODY_PENDING)
    assert.equal(row.dse_concept, 'Uses the glass barrier of a late-night diner')
    assert.equal(row.bio_short, row.dse_concept)
    assert.equal(artistReadText(row, true), row.dse_concept)
    assert.equal(artistReadText(row, false), row.dse_concept)
  })
})

describe('artistFields Chinese locales', () => {
  for (const locale of ['zh-Hant', 'zh-Hans'] as const) {
    it(`leaves ${locale} body text on the Chinese columns`, () => {
      const row = artistFields(
        {
          ...ZH,
          sba_theme_tags_en: ['urban alienation'],
          formal_traits_en: 'Geometric window frames',
          dse_concept_en: 'English concept',
          spld_summary_en: 'English summary',
          origin_en: 'Oil painting',
        },
        locale,
      )
      assert.deepEqual(row.themes, ZH.sba_theme_tags)
      assert.deepEqual(row.style_keywords, ['幾何窗框', '冷暖對比', '簡化寫實'])
      assert.equal(row.medium, '油畫')
      assert.equal(row.spld_summary, ZH.spld_summary)
      assert.equal(row.dse_concept, ZH.dse_concept)
      assert.equal(row.bio_short, ZH.spld_summary)
      assert.equal(artistReadText(row, true), ZH.spld_summary)
      assert.equal(artistReadText(row, false), ZH.spld_summary)
    })
  }

  it('still falls through to the concept when the Chinese summary is empty', () => {
    const row = artistFields({ ...ZH, spld_summary: '' }, 'zh-Hant')
    assert.equal(row.bio_short, ZH.dse_concept)
    assert.equal(artistReadText(row, true), ZH.dse_concept)
  })

  it('prefers zh-Hans body fields and does not let them replace zh-Hant or EN', () => {
    const row: ArtistBodySource = {
      ...ZH,
      sba_theme_tags_zh_hans: ['私密空间', '日常物', '情绪'],
      formal_traits_zh_hans: '手绘布、家居现成物、低调装置',
      dse_concept_zh_hans: '将日常布料和家居物转化为情感和私密空间装置',
      spld_summary_zh_hans: '香港艺术家。用手绘布和家居物件表达私人情绪空间',
      origin_zh_hans: '装置／混合',
      sba_theme_tags_en: ['intimate space'],
      formal_traits_en: 'Hand-drawn cloth',
      dse_concept_en: 'English concept',
      spld_summary_en: 'English summary',
      origin_en: 'Installation',
    }
    const hans = artistFields(row, 'zh-Hans')
    assert.deepEqual(hans.themes, ['私密空间', '日常物', '情绪'])
    assert.deepEqual(hans.style_keywords, ['手绘布', '家居现成物', '低调装置'])
    assert.equal(hans.medium, '装置／混合')
    assert.equal(hans.dse_concept, '将日常布料和家居物转化为情感和私密空间装置')
    assert.equal(hans.spld_summary, '香港艺术家。用手绘布和家居物件表达私人情绪空间')
    assert.equal(hans.bio_short, hans.spld_summary)
    assert.equal(artistReadText(hans, true), hans.spld_summary)
    assert.equal(artistReadText(hans, false), hans.bio_short)
    const shown = [hans.medium, hans.bio_short, hans.dse_concept, hans.spld_summary, ...hans.themes, ...hans.style_keywords].join('\n')
    assert.equal(/SPLD|SEN|spld_summary|诊断|診斷/.test(shown), false)
    assert.equal(shown.includes('油畫'), false)
    assert.equal(shown.includes('都市疏離'), false)

    const hant = artistFields(row, 'zh-Hant')
    assert.deepEqual(hant.themes, ZH.sba_theme_tags)
    assert.equal(hant.medium, '油畫')
    assert.equal(hant.bio_short, ZH.spld_summary)
    assert.equal(hant.dse_concept, ZH.dse_concept)

    const en = artistFields(row, 'en')
    assert.deepEqual(en.themes, ['intimate space'])
    assert.equal(en.medium, 'Installation')
    assert.equal(en.bio_short, 'English summary')
    assert.equal(en.dse_concept, 'English concept')
    assert.equal(HAN.test([en.medium, en.bio_short, ...en.themes].join(' ')), false)
  })

  it('falls back to the Traditional columns when a zh-Hans field is blank', () => {
    const row = artistFields(
      {
        ...ZH,
        spld_summary_zh_hans: '  ',
        origin_zh_hans: '',
        sba_theme_tags_zh_hans: [],
        formal_traits_zh_hans: null,
      },
      'zh-Hans',
    )
    assert.equal(row.bio_short, ZH.spld_summary)
    assert.equal(row.medium, '油畫')
    assert.deepEqual(row.themes, ZH.sba_theme_tags)
    assert.deepEqual(row.style_keywords, ['幾何窗框', '冷暖對比', '簡化寫實'])
  })
})

describe('pairFields', () => {
  it('uses English pair labels and the pending placeholder when they are blank', () => {
    const filled = pairFields(
      {
        theme: '觀察寫實與解剖',
        medium: '油畫／素描 · 水墨',
        theme_en: 'Observational realism & anatomy',
        medium_en: 'Oil/drawing · ink drawing',
      },
      'en',
    )
    assert.equal(filled.theme, 'Observational realism & anatomy')
    assert.equal(filled.medium, 'Oil/drawing · ink drawing')
    assert.equal(HAN.test(`${filled.theme} ${filled.medium}`), false)

    const blank = pairFields({ theme: '觀察寫實與解剖', medium: '油畫', theme_en: ' ', medium_en: null }, 'en')
    assert.equal(blank.theme, EN_BODY_PENDING)
    assert.equal(blank.medium, EN_BODY_PENDING)

    const zh = pairFields({ theme: '觀察寫實與解剖', medium: null, theme_en: 'Observational realism & anatomy', medium_en: 'Oil' }, 'zh-Hant')
    assert.equal(zh.theme, '觀察寫實與解剖')
    assert.equal(zh.medium, null)
  })
})

describe('EN sql pack', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations')

  it('adds English columns without rewriting name_zh_en', () => {
    const artists = readFileSync(join(root, '20261105_artists_en_columns.sql'), 'utf8')
    const pairs = readFileSync(join(root, '20261106_artist_pairs_en.sql'), 'utf8')
    for (const column of ['sba_theme_tags_en', 'formal_traits_en', 'dse_concept_en', 'spld_summary_en', 'origin_en', 'theme_en', 'medium_en']) {
      assert.match(artists, new RegExp(column))
    }
    assert.equal(/name_zh_en\s*=/.test(artists), false)
    for (const id of ['WEST-HOPPER-01', 'HK-PAK-01', 'CN-AIWW-01']) {
      assert.match(artists, new RegExp(id))
    }
    assert.match(artists, /urban alienation/)
    assert.match(artists, /everyday ready-mades/)
    assert.match(artists, /social engagement/)
    assert.match(pairs, /theme_en = 'Observational realism & anatomy'/)
    assert.match(pairs, /PAIR-REALISM-01/)
  })
})
