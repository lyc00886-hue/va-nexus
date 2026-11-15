import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const messages = (path: string) => JSON.parse(read(path)) as Record<string, string>

const HANT = {
  'unit.thematic.label': '主題式教學單元',
  'unit.f4u3.theme.label': '主題',
  'unit.f4u3.theme': '認識社區藝術',
  'unit.f4u3.themeMessage.label': '主題信息',
  'unit.f4u3.themeMessage': '社區藝術由身邊嚟。睇清楚地方同人，再用創作講出嚟。',
  'unit.f4u3.connect': '同一主題底下，兩課連住行：研究先，之後發展同創作。',
  'unit.f4u3.strand.knowledge.label': '視覺藝術知識',
  'unit.f4u3.strand.knowledge': '睇線、形、色、質感同構圖，點樣呈現人物、地方、習慣同物件。',
  'unit.f4u3.strand.appreciate.label': '視覺藝術評賞',
  'unit.f4u3.strand.appreciate': '睇案例同近身細節，講清楚對象、焦點，同相關視覺元素。',
  'unit.f4u3.strand.create.label': '視覺藝術創作',
  'unit.f4u3.strand.create': '將近身洞察變成課堂短試驗，再用三句講主題、做法同感受。',
  'lesson.f4u3l3.title': '十一月：認識社區藝術——研究',
  'lesson.f4u3l4.title': '十一月：認識社區藝術——發展同創作',
  'lesson.f4u3l3.unitLine': '呢課喺同一個主題式教學單元入面，先做研究。',
  'lesson.f4u3l4.unitLine': '呢課承住同一主題信息，將研究發展成創作。',
  'lesson.f4u3l3.subtitle': '喺課堂認識咩係社區藝術，配過往案例參考。唔使出外做計劃。',
  'image.added.caption': '本課再加插圖 · 自制 · VA-Nexus',
  'image.keep.caption': '已有合格原圖 · 自制 · VA-Nexus',
  'image.path.themeUnit': '/content/learning-map-illustrations/f4-thematic/F4-U3-theme-unit.png',
  'image.path.lived': '/content/learning-map-illustrations/f4-thematic/F4-U3-lived-community.png',
  'image.path.research': '/content/learning-map-illustrations/f4-thematic/F4-U3-L3-research-path.png',
  'image.path.create': '/content/learning-map-illustrations/f4-thematic/F4-U3-L4-create-continue.png',
  'image.path.strands': '/content/learning-map-illustrations/f4-thematic/F4-U3-strands-woven.png',
} as const

const ADDED = {
  'F4-U3-theme-unit.png': ['204ce9be6314992fa81ec439f10d7a5dd11521f64b78bc4a154691fd8e9a4bd9', 910487],
  'F4-U3-lived-community.png': ['278ea01224dd42359a888aa32b3682f27a96902c0fd8a16348654187b4ac188a', 604356],
  'F4-U3-L3-research-path.png': ['b2bf6fe78df7e96bd07bcca3fc1de5e75e7c5b88e3e47ccad1ffd67892b34f63', 674562],
  'F4-U3-strands-woven.png': ['e39a957f63b09e2f1a3dad147fab02b809b6352cdb6021acf80b5e0799e9446c', 770344],
} as const

const KEEP = {
  'public/content/learning-map-illustrations/f4-covers/F4-U3-L3.png': '3b0eab8d0938c5ef008bc58ef30db6a26a5a13f2da57a830007dd0ca2d87826c',
  'public/content/learning-map-illustrations/f4-covers/F4-U3-L4.png': '217d9f3022faa0535f417e1510f01746b767374bcaab32dbcfcae386974c7b1a',
  'public/content/learning-map-illustrations/f4-lesson-cards/F4-U3-L3-c0.png': '2a0ff1d1265199e937499e8a6d43ead2e9d2bea3ec9185652c06b7597ff87014',
  'public/content/learning-map-illustrations/f4-lesson-cards/F4-U3-L3-c1.png': '540a067177aea16320d31c43889eca24337283fbabade72510f4a0f64b2d4729',
  'public/content/learning-map-illustrations/f4-lesson-cards/F4-U3-L4-c0.png': '358fed0062a6fe86b67284efed4dcab3ba3ede5582bc6cb8fccfcd862d2b55a4',
  'public/content/learning-map-illustrations/f4-lesson-cards/F4-U3-L4-c1.png': '987cfb7a566eb7fa083ac8bae4502f5937793a9cf048f745aec4ea301f6b232e',
  'public/content/learning-map-illustrations/f4-lesson-cards/F4-U3-L4-c2.png': '083cf69411ad7d03a6db28a6453259fcb690e4fef661e3b7712214fa321baf60',
} as const

const BANNED =
  /ArtInSight|洞察藝術|洞察艺术|ArtGPT|Unlock the limit|評分校準|评分校准|開閘|开闸|\bRELAY\b|主题式教学|雙圖對讀|双图对读|keyouji|課游記|课游记|5\*\*|連勝|奪星|競技場|單元寶箱|gems/i

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(join(root, path))).digest('hex')
}

describe('F4-U3-L3 thematic research slice', () => {
  it('locks the new zh-Hant copy and keeps both lesson titles', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    for (const [key, value] of Object.entries(HANT)) {
      assert.equal(hant[key], value, key)
      if (!key.startsWith('image.path.')) assert.equal(/[\u7684\u628A\u5572]/.test(value), false, key)
    }
    assert.equal(hant['lesson.f4u3l3.title'].split('\u2014').length - 1, 2)
    assert.equal(hant['lesson.f4u3l4.title'].split('\u2014').length - 1, 2)
    const fresh = hant['unit.f4u3.themeMessage'] + hant['lesson.f4u3l3.unitLine']
    assert.equal([...fresh].filter((ch) => ch === '\u569F').length, 2)
    assert.equal(fresh.includes('\u6765'), false)
    assert.equal(BANNED.test(Object.values(HANT).join('\n')), false)
  })

  it('ships four added originals and leaves the qualified covers and cards', () => {
    const dir = 'public/content/learning-map-illustrations/f4-thematic'
    const names = readdirSync(join(root, dir)).sort()
    assert.deepEqual(names, Object.keys(ADDED).sort())
    for (const [name, [hash, bytes]] of Object.entries(ADDED)) {
      const path = `${dir}/${name}`
      assert.equal(statSync(join(root, path)).size, bytes, name)
      assert.equal(sha256(path), hash, name)
    }
    for (const [path, hash] of Object.entries(KEEP)) assert.equal(sha256(path), hash, path)
    assert.equal(existsSync(join(root, HANT['image.path.create'].slice(1))), false)
  })

  it('wires the research lesson only and leaves the paired lesson line unwired', () => {
    const view = read('src/components/game/F4ThematicResearch.tsx')
    const player = read('src/components/game/LessonPlayer.tsx')
    assert.equal(player.split("lesson.id === 'F4-U3-L3'").length - 1, 2)
    assert.match(player, /F4ThematicResearch/)
    assert.match(view, /if \(lesson\.id !== THEMATIC_LESSON\) return null/)
    assert.match(view, /image\.path\.themeUnit/)
    assert.match(view, /image\.path\.lived/)
    assert.match(view, /image\.path\.research/)
    assert.match(view, /image\.added\.caption/)
    assert.match(view, /image\.keep\.caption/)
    assert.match(view, /lesson\.f4u3l3\.unitLine/)
    assert.match(view, /LessonCardArt image=\{card\.image\} credit=\{card\.imageCredit\}/)
    assert.equal(view.includes('lesson.f4u3l4.unitLine'), false)
    assert.equal(view.includes('image.path.create'), false)
    assert.equal(view.includes('image.path.strands'), false)
    assert.equal(view.includes('F4-U3-L4-create-continue'), false)
    assert.equal(view.includes('loading='), false)
    assert.equal(BANNED.test(view), false)
    assert.equal(/[\u7684\u628A\u5572]/.test(view), false)
    assert.equal(readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).length, 11)
  })
})
