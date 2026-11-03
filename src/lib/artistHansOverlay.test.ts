import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { artistFields, type ArtistBodySource } from './artistBody.ts'
import {
  ARTIST_ZH_HANS_OVERLAY,
  artistRowForLocale,
  type ArtistHansPack,
} from './artistHansOverlay.ts'

const BANNED = /SPLD|SEN|spld_summary|诊断|診斷/
const CANTONESE =
  /[嘅咗唔係喺嘢冇啲佢咁噉嚟睇揀撳揿啱拎搵揾乜呢俾畀嗰哋晒]|點樣|点样|屋企|返学|返學|寫低|写低|而家|边个|邊個/

const F4 = ['HK-LEEKIT-01', 'HK-PAK-01', 'HK-SHIEH-01', 'HK-WUCIUS-01', 'WEST-HOCKNEY-01', 'WEST-KAHLO-01'] as const

const BATCH1 = [
  'CN-AIWW-01',
  'CN-BADASHANREN-01',
  'CN-FANGLJ-01',
  'CN-GAOJF-01',
  'CN-LV-01',
  'CN-WANGGY-01',
  'CN-XUBING-01',
  'CN-YUEMJ-01',
  'CN-ZAO-01',
  'CN-ZHANGXG-01',
  'HK-LEEKIT-01',
  'HK-LUISCHAN-01',
  'HK-PAK-01',
  'HK-SHIEH-01',
  'HK-WUCIUS-01',
  'WEST-ELIASSON-01',
  'WEST-HOCKNEY-01',
  'WEST-HOPPER-01',
  'WEST-KAHLO-01',
  'WEST-MAGRITTE-01',
  'WEST-MONDRIAN-01',
  'WEST-ROTHKO-01',
  'WEST-VANGOGH-01',
  'WEST-WARHOL-01',
] as const

const F4_HANS: Record<(typeof F4)[number], ArtistHansPack> = {
  'HK-LEEKIT-01': {
    name_zh_hans: '李杰',
    sba_theme_tags: '私密空间;日常物;情绪',
    formal_traits: '手绘布、家居现成物、低调装置',
    dse_concept: '将日常布料和家居物转化为情感和私密空间装置',
    spld_summary: '香港艺术家。用手绘布和家居物件表达私人情绪空间',
    medium: '装置／混合',
  },
  'HK-PAK-01': {
    name_zh_hans: '白双全',
    sba_theme_tags: '城市空间;日常现成物;压迫感',
    formal_traits: '日常透明胶袋、身体空间量度、极简过程纪录',
    dse_concept: '收集一屋空气，将狭小住屋压迫感物质化',
    spld_summary: '香港艺术家。用透明胶袋装起整间屋的空气，表现住屋挤迫',
  },
  'HK-SHIEH-01': {
    sba_theme_tags: '身份;工笔;当代人物',
    formal_traits: '传统工笔线描、当代衣着角色、戏谑改编',
    dse_concept: '用工笔古法画当代人，探讨香港身份和性别角色',
    spld_summary: '香港画家。用工笔画现代人和戏服角色',
    medium: '工笔',
  },
  'HK-WUCIUS-01': {
    name_zh_hans: '王无邪',
    sba_theme_tags: '设计结构;水墨几何;山水',
    formal_traits: '几何分割、设计式构图、传统山水语汇',
    dse_concept: '以设计原则重组水墨山水，连接现代视觉和传统',
    spld_summary: '香港艺术家。用水墨加上几何设计结构画山水',
    medium: '水墨／设计',
  },
  'WEST-HOCKNEY-01': {
    name_zh_hans: '大卫·霍克尼',
    sba_theme_tags: '家庭;凝视;平面色彩',
    formal_traits: '鲜明平涂、多点透视、亲密室内场景',
    dse_concept: '《我的父母》等作品以冷静构图审视亲密关系和观看',
    spld_summary: '英国画家。用鲜明平涂色彩画家人和泳池，构图清晰',
    medium: '油画',
  },
  'WEST-KAHLO-01': {
    name_zh_hans: '弗里达·卡罗',
    sba_theme_tags: '身份;身体;痛苦;性别',
    formal_traits: '自传符号、对称构图、鲜明本土色彩',
    dse_concept: '以自画像将个人伤痛和文化身份视觉化',
    spld_summary: '墨西哥画家。以自画像讲述自己身体的痛苦和身份',
    medium: '油画',
  },
}

function hantRow(artistId: string): ArtistBodySource & {
  artist_id: string
  name_zh_en: string
  name_zh_hans: string
} {
  return {
    artist_id: artistId,
    name_zh_en: '傳統名 (Trad Name)',
    name_zh_hans: '傳統名',
    sba_theme_tags: ['傳統主題'],
    formal_traits: '傳統筆法、衣著',
    dse_concept: '傳統概念',
    spld_summary: '傳統摘要',
    origin: '傳統媒介',
    sba_theme_tags_en: ['english theme'],
    formal_traits_en: 'English traits',
    dse_concept_en: 'English concept',
    spld_summary_en: 'English summary',
    origin_en: 'English medium',
  }
}

function shown(body: ReturnType<typeof artistFields>): string {
  return [body.medium, body.bio_short, body.dse_concept, body.spld_summary, ...body.themes, ...body.style_keywords]
    .filter((part): part is string => Boolean(part))
    .join('\n')
}

describe('zh-Hans artist overlay', () => {
  it('covers the library, including batch-1 and the F4 map artists', () => {
    const ids = Object.keys(ARTIST_ZH_HANS_OVERLAY)
    const fields = Object.values(ARTIST_ZH_HANS_OVERLAY).reduce((n, pack) => n + Object.keys(pack).length, 0)
    assert.equal(ids.length, 126)
    assert.equal(fields, 700)
    for (const id of BATCH1) assert.ok(ARTIST_ZH_HANS_OVERLAY[id], id)
    assert.equal(BATCH1.length, 24)
    for (const id of F4) assert.deepEqual(ARTIST_ZH_HANS_OVERLAY[id], F4_HANS[id], id)
  })

  it('keeps student-facing Hans text free of SPLD, SEN, diagnosis labels, and 衣著', () => {
    for (const [id, pack] of Object.entries(ARTIST_ZH_HANS_OVERLAY)) {
      for (const value of Object.values(pack)) {
        assert.equal(BANNED.test(value), false, `${id} ${value}`)
        assert.equal(value.includes('衣著'), false, `${id} ${value}`)
        assert.equal(CANTONESE.test(value), false, `${id} ${value}`)
      }
    }
    assert.equal(ARTIST_ZH_HANS_OVERLAY['HK-SHIEH-01'].formal_traits?.includes('衣着'), true)
  })

  it('maps zh-Hans onto Simplified fields and leaves Hant and EN columns unchanged', () => {
    for (const [id, pack] of Object.entries(ARTIST_ZH_HANS_OVERLAY)) {
      const row = hantRow(id)
      const hantPass = artistRowForLocale(row, 'zh-Hant')
      const enPass = artistRowForLocale(row, 'en')
      assert.equal(hantPass, row)
      assert.equal(enPass, row)

      const source = artistRowForLocale(row, 'zh-Hans')
      assert.notEqual(source, row)
      assert.equal(row.formal_traits, '傳統筆法、衣著')
      assert.equal(row.name_zh_en, '傳統名 (Trad Name)')
      assert.equal(source.formal_traits, row.formal_traits)
      assert.equal(source.dse_concept, row.dse_concept)
      assert.equal(source.spld_summary, row.spld_summary)
      assert.equal(source.origin, row.origin)
      assert.deepEqual(source.sba_theme_tags, row.sba_theme_tags)
      assert.equal(source.name_zh_en, row.name_zh_en)
      assert.equal(source.formal_traits_en, 'English traits')
      assert.equal(source.origin_en, 'English medium')
      assert.equal(source.spld_summary_en, 'English summary')
      assert.equal(source.name_zh_hans, pack.name_zh_hans?.trim() || '傳統名')

      const hans = artistFields(source, 'zh-Hans')
      assert.equal(hans.themes.join(';'), pack.sba_theme_tags ?? '傳統主題')
      assert.equal(hans.style_keywords.join('、'), pack.formal_traits)
      assert.equal(hans.dse_concept, pack.dse_concept)
      assert.equal(hans.spld_summary, pack.spld_summary)
      assert.equal(hans.bio_short, pack.spld_summary)
      assert.equal(hans.medium, pack.medium ?? '傳統媒介')
      assert.equal(BANNED.test(shown(hans)), false, id)
      assert.equal(shown(hans).includes('衣著'), false, id)

      const hant = artistFields(source, 'zh-Hant')
      assert.deepEqual(hant.themes, ['傳統主題'])
      assert.equal(hant.medium, '傳統媒介')
      assert.equal(hant.bio_short, '傳統摘要')
      assert.equal(hant.style_keywords.join('、'), '傳統筆法、衣著')

      const en = artistFields(source, 'en')
      assert.deepEqual(en.themes, ['english theme'])
      assert.equal(en.medium, 'English medium')
      assert.equal(en.bio_short, 'English summary')
      assert.equal(en.dse_concept, 'English concept')
    }
  })

  it('uses 衣着 for HK-SHIEH-01 style chips under zh-Hans', () => {
    const source = artistRowForLocale(hantRow('HK-SHIEH-01'), 'zh-Hans')
    const hans = artistFields(source, 'zh-Hans')
    assert.deepEqual(hans.style_keywords, ['传统工笔线描', '当代衣着角色', '戏谑改编'])
    assert.equal(hans.style_keywords.some((chip) => chip.includes('衣著')), false)
    assert.equal(hans.medium, '工笔')
    assert.equal(hans.bio_short, '香港画家。用工笔画现代人和戏服角色')
    assert.equal(source.name_zh_hans, '傳統名')
  })

  it('does not render the spld_summary id in library or map artist detail chrome', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const files = ['components/ArtistDetail.tsx', 'components/ArtistCompare.tsx', 'components/game/LessonArtists.tsx']
    for (const file of files) {
      const src = readFileSync(join(root, file), 'utf8')
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
      assert.equal(code.includes('spld_summary'), false, file)
      assert.equal(code.includes('SPLD'), false, file)
    }
  })
})
