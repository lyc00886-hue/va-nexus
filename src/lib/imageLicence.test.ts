import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { imageDecision } from './imageLicence.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const COPY = {
  'zh-Hant': {
    'settings.reading': '閱讀設定',
    'critique.title': '評賞提示',
    'critique.lead': '評語會幫你寫清評賞對象同評賞焦點。',
    'critique.flex': '評賞方向可以跟整體感受、表象描述、形式分析、意義詮釋、價值判斷，按學與教需要靈活調動。',
    'critique.object': '你呢次評賞對象係《Paris Street; Rainy Day》雨中街道同《Moonlight, Strandgade 30》室內窗光。評賞焦點係邊張較適合做課題。',
    'critique.nudge': '整體感受可以再寫清楚。表象描述、形式分析同意義詮釋可以分開寫，最後先做價值判斷。呢幾個方向可以調動，唔使當成固定步驟。',
    'image.rule': '未有已核實 Public Domain 或 CC0，就唔用嗰張圖，亦唔用嗰位藝術家，改揀其他合適、已核實免費授權作品。',
    'image.sources': '圖源只可用 The Met Open Access、Art Institute of Chicago、Rijksmuseum Rijksstudio，或 Wikimedia Commons。',
    'image.blocked': '呢件作品未核實免費授權，所以唔用嗰張圖，亦唔用嗰位藝術家。請改揀其他已核實免費授權作品。',
    'image.homemade': '課卡主圖、題幹插圖、教學畫面同參考圖要改用已核實免費授權真實作品，並要列明出處同基本資料。只准課堂殼介面元素自制，並標「自制 · VA-Nexus」。',
    'image.school': '校本學生作品只可以用喺該課係評學生自己作品嘅場景，唔好頂藝術家原作。',
    'image.blockedTitle': '搵圖未通過授權核實',
    'image.ruleTitle': '搵圖同授權規則',
    'image.empty': '未有已核實授權圖像',
  },
  'zh-Hans': {
    'settings.reading': '阅读设定',
    'critique.title': '评赏提示',
    'critique.lead': '评语会帮你写清评赏对象同评赏焦点。',
    'critique.flex': '评赏方向可以跟整体感受、表象描述、形式分析、意义诠释、价值判断，按学与教需要灵活调动。',
    'critique.object': '你这次评赏对象是《Paris Street; Rainy Day》雨中街道同《Moonlight, Strandgade 30》室內窗光。评赏焦点是哪张较适合做课题。',
    'critique.nudge': '整体感受可以再写清楚。表象描述、形式分析与意义诠释可以分开写，最后先做价值判断。这几个方向可以调动，不必当成固定步骤。',
    'image.rule': '未有已核实 Public Domain 或 CC0，就不用嗰张图，亦不用嗰位艺术家，改拣其他合适、已核实免费授权作品。',
    'image.sources': '图源只可用 The Met Open Access、Art Institute of Chicago、Rijksmuseum Rijksstudio，或 Wikimedia Commons。',
    'image.blocked': '这件作品未核实免费授权，所以不用嗰张图，亦不用嗰位艺术家。请改拣其他已核实免费授权作品。',
    'image.homemade': '课卡主图、题干插图、教学画面同参考图要改用已核实免费授权真实作品，并要列明出处同基本资料。只准课堂壳界面元素自制，并标「自制 · VA-Nexus」。',
    'image.school': '校本学生作品只可用在该课是评学生自己作品嘅场景，不可顶艺术家原作。',
    'image.blockedTitle': '搵图未通过授权核实',
    'image.ruleTitle': '搵图同授权规则',
    'image.empty': '未有已核实授权图像',
  },
  en: {
    'settings.reading': 'Reading settings',
    'critique.title': 'Appreciation notes',
    'critique.lead': 'Feedback helps you name the object of appreciation and the focus of appreciation.',
    'critique.flex': 'You may follow overall impression, surface description, formal analysis, interpretation of meaning, and value judgement, and move among them as teaching and learning need.',
    'critique.object': 'This time, the objects of appreciation are the rainy street in Paris Street; Rainy Day and the interior window-light in Moonlight, Strandgade 30. The focus is which frame better suits a topic.',
    'critique.nudge': 'You can say the overall impression more clearly. Surface description, formal analysis, and interpretation of meaning can be written separately, then value judgement. These directions can be reordered; they are not a fixed step list.',
    'image.rule': 'If a work is not independently verified Public Domain or CC0, do not use that image and do not use that artist; pick another suitable, verified free-licence work.',
    'image.sources': 'Sources only: The Met Open Access, Art Institute of Chicago, Rijksmuseum Rijksstudio, or Wikimedia Commons.',
    'image.blocked': 'This work is not verified as free-licensed, so do not use that image and do not use that artist. Please pick another verified free-licence work.',
    'image.homemade': 'Lesson-card mains, question-stem illustrations, teaching screens, and reference images must use verified free-licence real works, and must list the source and basic facts. Only classroom-shell interface elements may be original, and must be labelled "Original · VA-Nexus".',
    'image.school': "School-based student work may appear only when that lesson is assessing the student's own work, never as a stand-in for an artist's original.",
    'image.blockedTitle': 'Image search did not pass licence checks',
    'image.ruleTitle': 'Image search and licence rules',
    'image.empty': 'No verified licensed image',
  },
} as const

const BANNED_GLYPH = /[\u7684\u628A\u5572\u4F86\u6765\u771E\u6415\u64C0\u5449]/

describe('classroom image licence and new card copy', () => {
  it('keeps the official supplement strings and the live lesson strings', () => {
    const files = {
      'zh-Hant': 'src/i18n/zh-Hant.json',
      'zh-Hans': 'src/i18n/zh-Hans.json',
      en: 'src/i18n/en.json',
    } as const
    for (const locale of Object.keys(files) as (keyof typeof files)[]) {
      const bag = JSON.parse(readFileSync(join(root, files[locale]), 'utf8')) as Record<string, string>
      for (const [key, value] of Object.entries(COPY[locale])) {
        assert.equal(bag[key], value, `${locale} ${key}`)
      }
      if (locale !== 'en') {
        for (const value of Object.values(COPY[locale])) {
          assert.equal(BANNED_GLYPH.test(value), false, value)
        }
      }
    }
    const hant = JSON.parse(readFileSync(join(root, 'src/i18n/zh-Hant.json'), 'utf8')) as Record<string, string>
    assert.equal(hant['image.blockedTitle'].includes('\u6435'), true)
    assert.equal(hant['image.ruleTitle'].includes('\u6435'), true)
    assert.equal(hant['image.rule'].includes('\u63C0'), true)
    assert.equal(hant['qtype.practiceOnly'], '練習結構 · 唔係真題')
    assert.equal(hant['qtype.chip.dualRead'], '藝術評賞比較')
    assert.equal(hant['lp.step'], '第 {x} 步／共 {y} 步')
    assert.equal(hant['lp.exit'], '離開課堂')
    assert.equal(hant['lp.check'], '檢查答案')
    assert.equal(hant['tts.read'], '朗讀')
    assert.equal(hant['fw.title'], '費德曼四步寫作')
  })

  it('shows shipped appreciation frames and blocks an unverified search', () => {
    assert.equal(
      imageDecision({
        image: '/content/learning-map-illustrations/f5-pd/met-53228-bokushos-splashed-ink-landscape.jpg',
        artist: 'Bokushō Shūshō',
        source: 'Metropolitan Museum of Art, New York, NY',
        role: 'appreciation',
      }),
      'show',
    )
    assert.equal(
      imageDecision({
        image: '/content/learning-map-illustrations/f4-pd/met-37093-hiroshige-fireworks-ryogoku.jpg',
        role: 'appreciation',
      }),
      'show',
    )
    assert.equal(
      imageDecision({
        image: '/content/learning-map-illustrations/soft-scout/f4-dualread/06-u3-l2-dualread.png',
        role: 'appreciation',
      }),
      'show',
    )
    assert.equal(
      imageDecision({
        image: '/content/learning-map-illustrations/met-open/45756.jpg',
        role: 'teaching',
      }),
      'show',
    )
    assert.equal(
      imageDecision({
        image: '/content/learning-map-illustrations/f5-lesson-cards/F5-U3-L4-c0.png',
        role: 'teaching',
      }),
      'block',
    )
    assert.equal(
      imageDecision({
        image: '/content/learning-map-illustrations/moods/motion-v2/otter-map-idle.png',
        role: 'chrome',
      }),
      'show',
    )
    assert.equal(
      imageDecision({
        image: '/content/learning-map-illustrations/not-verified/local.png',
        license: 'Public Domain',
        role: 'appreciation',
      }),
      'block',
    )
    assert.equal(
      imageDecision({
        image: 'https://images.metmuseum.org/example.jpg',
        license: 'CC0',
        source: 'The Met',
        role: 'appreciation',
      }),
      'block',
    )
    assert.equal(
      imageDecision({
        image: 'https://www.tate.org.uk/art/images/work.jpg',
        artist: 'Example',
        role: 'appreciation',
      }),
      'block',
    )
    assert.equal(
      imageDecision({
        image: '/content/learning-map-illustrations/artist-refs/HK-PAK-01-reference.png',
        artist: '白雙全',
        role: 'appreciation',
      }),
      'block',
    )
    assert.equal(
      imageDecision({
        image: '/content/learning-map-illustrations/artist-refs/HK-LEEKIT-01-reference.png',
        artist: '李傑',
        role: 'appreciation',
      }),
      'block',
    )
    assert.equal(imageDecision({ image: '/content/own-work.png', role: 'own-work', ownWorkLesson: false }), 'block')
    assert.equal(imageDecision({ image: '/content/own-work.png', role: 'own-work', ownWorkLesson: true }), 'block')
    assert.equal(imageDecision({ image: '/content/own-work.png', role: 'teaching' }), 'block')
  })

  it('wires the classroom faces without a pale check button or a mid-card quiz chip', () => {
    const player = readFileSync(join(root, 'src/components/game/LessonPlayer.tsx'), 'utf8')
    const faces = readFileSync(join(root, 'src/components/game/ClassroomFaces.tsx'), 'utf8')
    assert.match(player, /data-reading-settings|tucked/)
    assert.match(player, /CritiqueFace/)
    assert.match(player, /ImageRuleFace/)
    assert.match(player, /ImageBlockedFace/)
    assert.match(player, /shadow-\[0_4px_0_#0F766E\]/)
    assert.equal(player.includes('disabled:bg-[#E4EAF2]'), false)
    assert.equal(player.includes("t('lp.quiz')"), false)
    assert.equal(player.includes('QuestionTypeChips'), false)
    assert.match(faces, /critique\.title/)
    assert.match(faces, /image\.ruleTitle/)
    assert.match(faces, /image\.blockedTitle/)
    assert.match(faces, /image\.empty/)
    assert.equal(/Feldman|DAIE|ArtInsight|Duolingo|SENCritique/.test(faces), false)
    for (const value of Object.values(COPY['zh-Hant'])) {
      assert.equal(/Feldman|DAIE|ArtInsight|Duolingo/.test(value), false)
    }
  })
})
