import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
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
  'lesson.f4u3l4.subtitle': '喺課堂睇過往案例，再用課堂練習將認識發展成創作。唔使出外做計劃。',
  'image.added.caption': '本課再加插圖 · 自制 · VA-Nexus',
  'image.keep.caption': '已有合格原圖 · 自制 · VA-Nexus',
  'image.realistic.caption': '本課寫實原圖 · 自制 · VA-Nexus',
  'image.path.themeUnit': '/content/learning-map-illustrations/f4-thematic/F4-U3-theme-unit.png',
  'image.path.lived': '/content/learning-map-illustrations/f4-thematic/F4-U3-lived-community.png',
  'image.path.research': '/content/learning-map-illustrations/f4-thematic/F4-U3-L3-research-path.png',
  'image.path.create': '/content/learning-map-illustrations/f4-thematic/F4-U3-L4-create-continue.png',
  'image.path.strands': '/content/learning-map-illustrations/f4-thematic/F4-U3-strands-woven.png',
} as const

const ADDED = {
  'F4-U3-theme-unit.png': ['738f8bc30fe4705adbbd61c0f3caee2a8094450c054219738e0512ba25d84fc9', 1302597],
  'F4-U3-lived-community.png': ['8ea90ae34245b2903bafbc4e06bccb82511a653634a371ecc872488624ddd4fe', 1369796],
  'F4-U3-L3-research-path.png': ['648d680f59a692325323c47bcd87ce53d6dd3db44b226163a0a27513fd3c72a0', 1138806],
  'F4-U3-strands-woven.png': ['1199696fa8dc9e1364063d4a5cc4adc8a6a0928adcafe2e770075a61f41c86dd', 1383568],
  'F4-U3-L4-create-continue.png': ['59d4c9bcc876eca31654678cf16d4c499090556853f0aa6de5b08276e4f4fbbb', 1201190],
} as const

const KEEP = {
  'public/content/learning-map-illustrations/f4-covers/F4-U3-L3.png': '3ce86562819a66149831216716cf9facfe7df082ab9f574fcf3066ff0125dd6c',
  'public/content/learning-map-illustrations/f4-covers/F4-U3-L4.png': '742bf5e38f62a42eb64f08df6d8bf72d2d7d8624bd24913e2bc1d6606feb8476',
  'public/content/learning-map-illustrations/f4-lesson-cards/F4-U3-L3-c0.png': '51cd26fcc28c7337560f0edfe0759ad2c59c5c58e7c998b5c4e506f61dba74b2',
  'public/content/learning-map-illustrations/f4-lesson-cards/F4-U3-L3-c1.png': '1d385c7c8a4f055f2e9c38f1a8c4cf11bbdb3cb96e977304e3f5445f157a428e',
  'public/content/learning-map-illustrations/f4-lesson-cards/F4-U3-L4-c0.png': 'c6203beb4da80665849abe8974380390541aed7a6246e59d08da58c6b04d44d0',
  'public/content/learning-map-illustrations/f4-lesson-cards/F4-U3-L4-c1.png': 'e51f3abe22c95583bb20844f8d8aa513b21f286aae1f374deb894cead0817f68',
  'public/content/learning-map-illustrations/f4-lesson-cards/F4-U3-L4-c2.png': '57cdc0f044f8e56c1452c90ff3b6e59b880c098e92bbb8bc66b3fd03238a5a47',
} as const

const BANNED =
  /ArtInSight|洞察藝術|洞察艺术|ArtGPT|Unlock the limit|評分校準|评分校准|開閘|开闸|\bRELAY\b|主题式教学|雙圖對讀|双图对读|keyouji|課游記|课游记|5\*\*|連勝|奪星|競技場|單元寶箱|gems/i

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(join(root, path))).digest('hex')
}

function pngSize(path: string): [number, number] {
  const buf = readFileSync(join(root, path))
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)]
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
    assert.equal(messages('src/i18n/en.json')['image.realistic.caption'], 'Realistic original for this lesson · Original · VA-Nexus')
    assert.equal(messages('src/i18n/zh-Hans.json')['image.realistic.caption'], '本课写实原图 · 自制 · VA-Nexus')
    assert.equal(/[\u7684\u628A\u5572]/.test(messages('src/i18n/zh-Hans.json')['image.realistic.caption']), false)
    const fresh = hant['unit.f4u3.themeMessage'] + hant['lesson.f4u3l3.unitLine']
    assert.equal([...fresh].filter((ch) => ch === '\u569F').length, 2)
    assert.equal(fresh.includes('\u6765'), false)
    assert.equal(BANNED.test(Object.values(HANT).join('\n')), false)
  })

  it('ships the realistic thematic originals and the swapped covers and cards', () => {
    const dir = 'public/content/learning-map-illustrations/f4-thematic'
    const names = readdirSync(join(root, dir)).sort()
    assert.deepEqual(names, Object.keys(ADDED).sort())
    for (const [name, [hash, bytes]] of Object.entries(ADDED)) {
      const path = `${dir}/${name}`
      assert.equal(statSync(join(root, path)).size, bytes, name)
      assert.equal(sha256(path), hash, name)
    }
    for (const [path, hash] of Object.entries(KEEP)) assert.equal(sha256(path), hash, path)
    const createPath = `${dir}/F4-U3-L4-create-continue.png`
    assert.equal(createPath.endsWith(HANT['image.path.create'].slice(1)), true)
    assert.equal(sha256(createPath), '59d4c9bcc876eca31654678cf16d4c499090556853f0aa6de5b08276e4f4fbbb')
    assert.deepEqual(pngSize(createPath), [1280, 720])
  })

  it('wires the research lesson and carries the same unit into making', () => {
    const view = read('src/components/game/F4ThematicResearch.tsx')
    const player = read('src/components/game/LessonPlayer.tsx')
    const intro = read('src/components/game/CommunityCases.tsx')
    assert.equal(player.split("lesson.id === 'F4-U3-L3'").length - 1, 2)
    assert.equal(player.split("lesson.id === 'F4-U3-L4'").length - 1, 2)
    assert.match(player, /F4ThematicResearch/)
    assert.match(view, /const THEMATIC_LESSON = 'F4-U3-L3'/)
    assert.match(view, /const CREATE_LESSON = 'F4-U3-L4'/)
    assert.match(view, /if \(lesson\.id !== THEMATIC_LESSON && lesson\.id !== CREATE_LESSON\) return null/)
    assert.match(view, /image\.path\.themeUnit/)
    assert.match(view, /image\.path\.lived/)
    assert.match(view, /image\.path\.research/)
    assert.match(view, /image\.path\.create/)
    assert.match(view, /image\.realistic\.caption/)
    assert.equal(view.includes('image.added.caption'), false)
    assert.equal(view.includes('image.keep.caption'), false)
    assert.match(view, /lesson\.f4u3l3\.unitLine/)
    assert.match(view, /lesson\.f4u3l4\.unitLine/)
    assert.match(view, /lesson\.f4u3l3\.subtitle/)
    assert.match(view, /lesson\.f4u3l4\.subtitle/)
    assert.match(view, /unit\.f4u3\.strand\.create/)
    assert.match(view, /LessonCardArt image=\{card\.image\} credit=\{card\.imageCredit\}/)
    assert.equal(view.includes('image.path.strands'), false)
    assert.equal(view.includes('F4-U3-strands-woven'), false)
    assert.equal(view.includes('loading='), false)
    assert.equal(BANNED.test(view), false)
    assert.equal(/[\u7684\u628A\u5572]/.test(view), false)
    assert.match(intro, /lessonId === 'F4-U3-L3' \|\| lessonId === 'F4-U3-L4' \? null/)
    assert.equal(readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).length, 11)
  })
})
