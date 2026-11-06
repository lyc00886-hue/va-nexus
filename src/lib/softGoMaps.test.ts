import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { mapUxPersist, mapVersionOf, mapVersionSearch } from './mapUx.ts'
import {
  F4_CHROME_KEY,
  historyUnitsFor,
  softGoGradeFromSearch,
  softGoTrackFromSearch,
  withF4ChromeTitles,
  withSoftGoQuery,
  yearUnitsFor,
} from './softGoMaps.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const SCHOOL = /CCCKLC|Kung Lee|功樂|孔教/

const UX = {
  'zh-Hant': {
    'ux.classic': '原版地圖',
    'ux.classicShort': '原版',
    'ux.map1': '闖關地圖',
    'ux.map1Short': '闖關',
    'ux.modeLabel': '切換地圖版本',
    'ux.switchToClassic': '轉去原版地圖',
    'ux.switchToMap1': '轉去闖關地圖',
    'ux.hint': '可以隨時轉另一個版本。',
    'map.f4.chrome.u1': '視藝入門',
    'map.f4.chrome.u2': '素描美感設計',
    'map.f4.chrome.u3': '社區藝術視覺日記',
    'map.f4.chrome.u4': '自畫像藝術家研究',
    'map.pickTitle': '揀地圖',
    'map.grade.all': '全部年級',
    'map.grade.f4': '中四',
    'map.grade.f5': '中五',
    'map.grade.f6': '中六',
    'map.scope.historyCn': '中國藝術史',
    'map.scope.historyWest': '西方藝術史',
    'map.scope.media': '媒介',
    'map.scope.f4': '中四',
    'map.scope.islands': '五大冒險島',
  },
  en: {
    'ux.classic': 'Classic map',
    'ux.classicShort': 'Classic',
    'ux.map1': 'Quest map',
    'ux.map1Short': 'Quest',
    'ux.modeLabel': 'Switch map version',
    'ux.switchToClassic': 'Switch to classic map',
    'ux.switchToMap1': 'Switch to quest map',
  },
  'zh-Hans': {
    'ux.classic': '原版地图',
    'ux.classicShort': '原版',
    'ux.map1': '闯关地图',
    'ux.map1Short': '闯关',
    'ux.modeLabel': '切换地图版本',
    'map.pickTitle': '选地图',
    'map.backTracks': '返回选地图',
    'map.grade.empty': '这个年级还没有地图 · 可以选全部年级',
    'map.f4.chrome.u1': '视艺入门',
    'map.f4.chrome.u2': '素描美感设计',
    'map.f4.chrome.u3': '社区艺术视觉日记',
    'map.f4.chrome.u4': '自画像艺术家研究',
  },
} as const

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(file: string): Record<string, string> {
  return JSON.parse(read(file)) as Record<string, string>
}

describe('map version toggle', () => {
  it('treats off as classic and persists map1 or classic', () => {
    assert.equal(mapVersionOf('?ux=map1', null), 'map1')
    assert.equal(mapVersionOf('?ux=classic', 'map1'), 'classic')
    assert.equal(mapVersionOf('?ux=off', 'map1'), 'classic')
    assert.equal(mapVersionOf('', null), 'classic')
    assert.equal(mapVersionOf('', 'map1'), 'map1')

    const toQuest = mapVersionSearch('?ux=off&island=history', 'map1')
    const questParams = new URLSearchParams(toQuest.slice(1))
    assert.equal(questParams.get('ux'), 'map1')
    assert.equal(questParams.get('island'), 'history')
    assert.equal(mapUxPersist(toQuest), 'set')

    const toClassic = mapVersionSearch('?ux=map1&track=f4', 'classic')
    const classicParams = new URLSearchParams(toClassic.slice(1))
    assert.equal(classicParams.get('ux'), 'classic')
    assert.equal(classicParams.get('track'), 'f4')
    assert.equal(mapUxPersist(toClassic), 'clear')
    assert.equal(mapUxPersist('?ux=off'), 'clear')
  })

  it('uses the locked version keys on both map shells', () => {
    const files = {
      'zh-Hant': 'src/i18n/zh-Hant.json',
      en: 'src/i18n/en.json',
      'zh-Hans': 'src/i18n/zh-Hans.json',
    } as const
    for (const locale of Object.keys(UX) as (keyof typeof UX)[]) {
      const bag = messages(files[locale])
      for (const [key, value] of Object.entries(UX[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
        assert.equal(/\bSoft\b/.test(value), false, key)
        assert.equal(SCHOOL.test(value), false, key)
      }
    }
    const toggle = read('src/components/game/MapVersionToggle.tsx')
    const map = read('src/components/game/LearningMap.tsx')
    const shell = read('src/lib/useMapOneShell.ts')
    for (const key of ['ux.modeLabel', 'ux.switchToClassic', 'ux.switchToMap1', 'ux.hint', 'ux.map1', 'ux.map1Short', 'ux.classic', 'ux.classicShort']) {
      assert.match(toggle, new RegExp(key.replace('.', '\\.')))
    }
    assert.match(toggle, /selectMapVersion\('map1'\)/)
    assert.match(toggle, /selectMapVersion\('classic'\)/)
    assert.equal(toggle.includes('SoftMotion'), false)
    assert.equal(toggle.includes('SoftAtlas'), false)
    assert.equal((map.match(/<MapVersionToggle/g) ?? []).length, 2)
    assert.match(map, /mapOne=\{false\}/)
    assert.match(shell, /mapUxPersist/)
    assert.match(shell, /MAP_UX_STORAGE_KEY/)
    assert.match(shell, /MAP_VERSION_EVENT/)
    assert.match(shell, /selectMapVersion/)
  })
})

describe('scope maps', () => {
  const sample = [
    { id: 'U1-CN-MODERN' },
    { id: 'U2-HK-IDENTITY' },
    { id: 'U3-WEST-MODERN' },
    { id: 'U4-CN-CONTEMP' },
  ]

  it('filters tracks and keeps F.5 and F.6 empty', () => {
    assert.equal(softGoTrackFromSearch('?ux=map1'), 'islands')
    assert.equal(softGoTrackFromSearch('?track=history-cn'), 'history-cn')
    assert.equal(softGoTrackFromSearch('?track=media'), 'media')
    assert.equal(softGoTrackFromSearch('?track=shop'), 'islands')
    assert.equal(softGoGradeFromSearch(''), 'all')
    assert.equal(softGoGradeFromSearch('?grade=f4'), 'f4')
    assert.equal(softGoGradeFromSearch('?grade=f6'), 'f6')
    assert.deepEqual(
      historyUnitsFor(sample, 'cn', 'all').map((unit) => unit.id),
      ['U1-CN-MODERN', 'U2-HK-IDENTITY', 'U4-CN-CONTEMP'],
    )
    assert.deepEqual(
      historyUnitsFor(sample, 'cn', 'f4').map((unit) => unit.id),
      ['U1-CN-MODERN'],
    )
    assert.deepEqual(
      historyUnitsFor(sample, 'west', 'all').map((unit) => unit.id),
      ['U3-WEST-MODERN'],
    )
    assert.deepEqual(historyUnitsFor(sample, 'west', 'f5'), [])
    assert.deepEqual(historyUnitsFor(sample, 'all', 'f6'), [])
    assert.equal(yearUnitsFor(sample, 'f4').length, sample.length)
    assert.deepEqual(yearUnitsFor(sample, 'f5'), [])
    const query = withSoftGoQuery('?ux=map1', 'f4', 'f4')
    const params = new URLSearchParams(query.slice(1))
    assert.equal(params.get('ux'), 'map1')
    assert.equal(params.get('track'), 'f4')
    assert.equal(params.get('grade'), 'f4')
    assert.equal(withSoftGoQuery('?ux=classic&track=f4&grade=f5', 'islands', 'all'), '?ux=classic')
  })

  it('uses the locked Form 4 chrome titles and keeps school and year words off them', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const titled = withF4ChromeTitles(
      [
        { id: 'F4-U1-ORIENT', title: '中四視藝入門：課程同 SBA 作品集' },
        { id: 'F4-U5-ART-HIST', title: '藝術史入門：古代西方同中國藝術' },
      ],
      (id) => {
        const key = F4_CHROME_KEY[id]
        return key ? hant[key] : undefined
      },
    )
    assert.equal(titled[0].title, '視藝入門')
    assert.equal(titled[1].title, '藝術史入門：古代西方同中國藝術')
    const year = /20\d{2}|中四|中五|中六|十一月|Form\s*4|F\.4/
    for (const key of Object.values(F4_CHROME_KEY)) {
      for (const file of ['src/i18n/zh-Hant.json', 'src/i18n/zh-Hans.json', 'src/i18n/en.json']) {
        const value = messages(file)[key]
        assert.equal(year.test(value), false, `${file} ${key} ${value}`)
        assert.equal(SCHOOL.test(value), false, `${file} ${key}`)
        assert.equal(/\bSoft\b/.test(value), false, key)
      }
    }
    const map = read('src/components/game/LearningMap.tsx')
    const picker = read('src/components/game/SoftMapPicker.tsx')
    const quest = read('src/components/game/MapQuest.tsx')
    assert.match(map, /HistoryTrack/)
    assert.match(map, /MapQuest/)
    assert.match(map, /data-map-scope="quest"/)
    assert.equal(map.includes('SoftMapPicker'), false)
    assert.equal(map.includes('SoftIllustrationMap'), false)
    assert.match(quest, /data-quest-map/)
    assert.match(picker, /map\.pickTitle/)
    assert.match(picker, /data-map-track/)
    assert.match(picker, /data-map-grade/)
    for (const banned of ['真題', '奪星', 'HKEAA', 'FOMO', 'streak', 'hearts', 'gems', 'CCCKLC', 'Kung Lee']) {
      assert.equal(map.includes(banned), false, banned)
      assert.equal(picker.includes(banned), false, banned)
    }
  })
})
