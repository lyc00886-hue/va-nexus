import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  DEEPFOOD_PAGE_URL,
  FURTHER_CLASSROOM_VIDEOS,
  HILL_BROCHURE_URL,
  HILL_PAGE_URL,
  HILL_VIDEO_ID,
  OFFICIAL_VIDEO_IDS,
  OVERVIEW_VIDEO_ID,
  applyCommunityLessonCopy,
  classroomEmbedUrl,
  classroomWatchUrl,
  communityCardCriteria,
  communityGoalKeys,
} from './communityCases.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const HANT = {
  'lesson.f4u3l3.title': '十一月：認識社區藝術——研究',
  'lesson.f4u3l3.subtitle': '喺課堂認識咩係社區藝術，配過往案例參考。唔使出外做計劃。',
  'lesson.f4u3l3.card.theme.body': '社區藝術主題來自真實環境——人物、地方、習慣、物件。先由課室、食堂、校門、返學路或記憶入面，揀一件近身細節嚟睇。',
  'lesson.f4u3l3.card.observe.body': '用速寫同筆記睇近身細節：課室角落、食堂座位、校門、返學路，或者一段記憶。影人之前要問准，尊重私隱。',
  'lesson.f4u3l3.card.interview.body': '課堂短訪問可以問同學：課室、食堂、校門或返學路有邊件你平時冇留意嘅嘢。短問題、留白、記錄關鍵句。',
  'lesson.f4u3l3.card.insight.body': '由課室、食堂、校門、返學路或記憶拎一個近身洞察：一件你以前冇留意、但同社區有關嘅細節。寫清楚你見到咩、點解同地方同人有關。',
  'lesson.f4u3l3.card.practice.body': '呢課喺課堂認識社區藝術，視覺日記每週繼續。練習由近身細節出發去做評賞同洞察。課堂唔用真實試卷。',
  'lesson.f4u3l4.title': '十一月：認識社區藝術——發展同創作',
  'lesson.f4u3l4.subtitle': '喺課堂睇過往案例，再用課堂練習將認識發展成創作。唔使出外做計劃。',
  'lesson.f4u3l4.card.make.body': '用課堂短試驗，將近身洞察變成創作練習——紙、筆、黏土或其他課堂物料都可以。寫低你用咩物料同技巧。',
  'lesson.f4u3l4.card.three.body': '用三句講呢次短試驗：主題、做法、想觀眾感受到咩。對住簡短準則先自評或請同學寫一句。',
  'lesson.f4u3l4.card.practice.body': '呢課喺課堂練習發展同創作方法，並做短試驗同三句講解。課堂唔用公開試正式成績聲稱。',
  'lesson.goal.hint': '呢課要你做到嘅可觀察成果',
  'lesson.f4u3l3.goal.1': '可以指出「邂逅！山 川 人」嘅評賞對象同焦點，並寫陶土同村落、地方同人嘅關係。',
  'lesson.f4u3l3.goal.2': '可以由課室、食堂、校門、返學路或記憶寫一個近身洞察，細節夠具體。',
  'lesson.f4u3l3.goal.3': '可以喺呢兩個例子入面，寫出相關視覺元素同組織原理。',
  'lesson.f4u3l4.goal.1': '可以指出深食「喚味：𝑥」嘅評賞對象同焦點，並寫食物、地方、人同「喚味」邀請。',
  'lesson.f4u3l4.goal.2': '可以喺課堂現場用紙、筆、黏土或其他課堂物料，做十至十五分鐘短試驗。唔上載作品。',
  'lesson.f4u3l4.goal.3': '可以用三句講呢次短試驗：主題、做法、想觀眾感受到咩。表達開放，唔設單一標準答案。',
  'lesson.goal.open': '表達開放，唔設單一標準答案。',
  'criteria.insight.title': '近身洞察簡短準則',
  'criteria.insight.line': '細節夠具體；同社區有關；寫到你見到嘅地方或人。',
  'criteria.talk.title': '三句講解簡短準則',
  'criteria.talk.line': '主題清楚；講到做法；講到想觀眾感受到咩。',
  'criteria.comment.prompt': '教師、同儕或自評一句：',
  'criteria.comment.placeholder': '喺呢度寫一句回饋。',
  'criteria.note': '呢步係課內進展性評估，非公開試／非 HKEAA。唔做公開試級別預測。',
  'case.hill.title': '邂逅！山 川 人',
  'case.hill.english': 'Hi! Hill public art project',
  'case.hill.org': '主辦 康樂及文化事務署',
  'case.hill.plan': '策劃 藝術推廣辦事處',
  'case.hill.partner': '在地藝術策劃伙伴 創不同協作',
  'case.hill.when': '11.3–12.8.2018',
  'case.hill.where': '前川龍貫文公立學校及荃灣川龍村',
  'case.hill.artist': '陳思光係參與藝術家之一，用村內陶土做陶瓷；唔係主辦或策劃。',
  'case.hill.source': '課堂參考用官方網頁同小冊子。未核實到官方可課堂播放嘅 YouTube。',
  'case.hill.frame': '呢個係過往案例參考，用嚟做有對象、有焦點嘅評賞。',
  'appreciate.heading': '評賞任務',
  'case.hill.appreciate.object': '評賞對象：參與藝術家陳思光用村內陶土做嘅陶瓷（川龍泥土陶杯／村內陶土作品）。',
  'case.hill.appreciate.focus': '評賞焦點：陶土同村落、地方同人嘅關係。',
  'case.hill.appreciate.task': '睇官方網頁同場刊，寫你見到陶土作品點樣連住村落同人。呢題唔係背景介紹。',
  'case.deepfood.collective': '深食',
  'case.deepfood.project': '喚味：𝑥',
  'case.deepfood.english': 'The Unexplored Flavour: 𝑥',
  'case.deepfood.invite': '油街實現邀請深食',
  'case.deepfood.venue': '場地 油街廚房',
  'case.deepfood.when': '1.6.2023–12.3.2024',
  'case.deepfood.frame': '呢個係課堂案例，只作課堂播放。',
  'case.deepfood.appreciate.object': '評賞對象：油街實現邀請深食嘅官方計劃「喚味：𝑥」。',
  'case.deepfood.appreciate.focus': '評賞焦點：食物、地方、人，同「喚味」邀請。',
  'case.deepfood.appreciate.task': '課堂預設播官方概覽片，只作課堂播放。寫你見到食物、地方同人點樣被邀請去「喚味」。',
  'visual.heading': '視覺元素同組織原理',
  'visual.elements.hill': '睇陶瓷時可以寫物料、質感、形態同顏色：陶土表面、杯形、燒成色澤，同村落環境點樣對比或呼應。',
  'visual.principles.near': '睇近身細節時可以寫空間、重複同強調：課室走廊、食堂座位排列、校門入口點樣引導視線。',
  'visual.elements.flavour': '睇「喚味：𝑥」時可以寫空間、色彩、動勢同平衡：食物、場地同人點樣被安排去邀請「喚味」。',
  'visual.trial': '短試驗可以試物料同質感，再用對比、強調或重複去組織你見到嘅近身細節。',
  'video.classroomOnly': '只作課堂播放',
  'video.noDownload': '呢課唔提供下載、上載或轉載。',
  'video.overviewTitle': '【喚味：𝑥 | The Unexplored Flavour: 𝑥】',
  'video.channel': '油街實現 Oi! (Oil Street Art Space)',
  'video.more': '另外三條官方課堂連結：個體、時間、空間。',
} as const

const EN = {
  'lesson.f4u3l3.title': 'November: Getting to know community art — research',
  'lesson.f4u3l3.subtitle': 'In class, learn what community art is, with past cases for reference. You do not need to go out and run a project.',
  'lesson.f4u3l4.title': 'November: Getting to know community art — develop and make',
  'lesson.f4u3l4.subtitle': 'In class, look at past cases, then use a classroom exercise to turn that recognition into making. You do not need to go out and run a project.',
  'lesson.f4u3l3.card.theme.body': 'A community-art theme comes from a real setting — people, places, habits and objects. Start in the classroom, the canteen, the school gate, the way to school, or a memory, and choose one nearby detail to look at.',
  'lesson.f4u3l3.card.insight.body': 'Take one nearby insight from the classroom, the canteen, the school gate, the way to school, or a memory: a detail you had not noticed before that relates to the community. Write clearly what you see, and why it relates to the place and the people.',
  'lesson.f4u3l4.card.make.body': 'Use a short classroom trial to turn a nearby insight into a making exercise — paper, a pen, clay, or other classroom materials. Write down which materials and skills you use.',
  'lesson.f4u3l4.card.three.body': 'Use three sentences for this short trial: the theme, how you made it, and what you want the audience to feel. Check the short criteria, then self-assess or ask a classmate to write one sentence.',
  'lesson.goal.hint': 'Observable outcomes this lesson asks you to reach',
  'lesson.f4u3l3.goal.1': 'You can point out the object and focus of appreciation for 「邂逅！山 川 人」, and write the relationship between the clay and the village, the place, and the people.',
  'lesson.f4u3l4.goal.1': 'You can point out the object and focus of appreciation for 深食「喚味：𝑥」, and write about food, place, people, and the 「喚味」 invitation.',
  'lesson.f4u3l4.goal.3': 'You can use three sentences for this short trial: the theme, how you made it, and what you want the audience to feel. Expression stays open, with no single standard answer.',
  'lesson.goal.open': 'Expression stays open, with no single standard answer.',
  'criteria.insight.title': 'Short criteria for a nearby insight',
  'criteria.talk.title': 'Short criteria for the three-sentence talk',
  'criteria.comment.prompt': 'One sentence from the teacher, a peer, or yourself:',
  'criteria.comment.placeholder': 'Write one sentence of feedback here.',
  'criteria.note': 'This step is in-class formative assessment, not a public exam and not HKEAA. It does not predict a public-exam level.',
  'case.hill.english': 'Hi! Hill public art project',
  'case.hill.frame': 'This is a past case for reference, used for appreciation with an object and a focus.',
  'appreciate.heading': 'Appreciation task',
  'case.hill.appreciate.object': 'Object of appreciation: ceramics made by participating artist 陳思光 with clay from the village (Chuen Lung clay cups / works in village clay).',
  'case.hill.appreciate.focus': 'Focus of appreciation: the relationship between the clay and the village, the place, and the people.',
  'case.hill.appreciate.task': 'Look at the official webpage and brochure, and write how the clay works connect the village and the people. This question is not a background introduction.',
  'case.deepfood.appreciate.object': 'Object of appreciation: the official project “喚味：𝑥”, for which Oi! invited Deep Food.',
  'case.deepfood.appreciate.focus': 'Focus of appreciation: food, place, and people, and the “喚味” invitation.',
  'case.deepfood.appreciate.task': 'The class plays the official overview by default, for classroom playback only. Write how you see food, place, and people being invited into “喚味”.',
  'visual.heading': 'Visual elements and organisational principles',
  'visual.elements.hill': 'When looking at the ceramics, you can write about material, texture, form, and colour: the clay surface, the cup shape, the fired colour, and how they contrast with or echo the village setting.',
  'visual.principles.near': 'When looking at nearby details, you can write about space, repetition, and emphasis: how the classroom corridor, the canteen seating, and the school-gate entrance guide the eye.',
  'visual.elements.flavour': 'When looking at “喚味：𝑥”, you can write about space, colour, movement, and balance: how food, the site, and people are arranged to invite “喚味”.',
  'visual.trial': 'A short trial can try material and texture, then use contrast, emphasis, or repetition to organise the nearby details you see.',
  'case.deepfood.collective': 'Deep Food',
  'case.deepfood.english': 'The Unexplored Flavour: 𝑥',
  'case.deepfood.invite': 'Oi! invited Deep Food',
  'case.deepfood.venue': 'Venue: Oi! Kitchen',
  'video.classroomOnly': 'For classroom playback only',
  'video.noDownload': 'This lesson does not offer download, upload, or republication.',
  'video.channel': '油街實現 Oi! (Oil Street Art Space)',
} as const

const HANS = {
  'lesson.f4u3l3.title': '十一月：认识社区艺术——研究',
  'lesson.f4u3l3.subtitle': '在课堂认识什么是社区艺术，并配以往案例参考。不必出外做计划。',
  'lesson.f4u3l4.title': '十一月：认识社区艺术——发展与创作',
  'lesson.f4u3l4.subtitle': '在课堂看以往案例，再用课堂练习将认识发展成创作。不必出外做计划。',
  'lesson.f4u3l3.card.insight.body': '从课室、食堂、校门、上学路或记忆取一个近身洞察：一件你以前没有留意、但与社区有关的细节。写清楚你看到什么、为什么与地方和人有关。',
  'lesson.f4u3l4.card.make.body': '用课堂短试验，将近身洞察变成创作练习——纸、笔、黏土或其他课堂物料都可以。写下你用什么物料和技巧。',
  'lesson.f4u3l4.goal.1': '可以指出深食「唤味：𝑥」的评赏对象和焦点，并写食物、地方、人和「唤味」邀请。',
  'lesson.goal.hint': '这课要你做到的可观察成果',
  'criteria.insight.line': '细节够具体；与社区有关；写到你看到的地方或人。',
  'criteria.note': '这步是课内进展性评估，非公开试／非 HKEAA。不做公开试级别预测。',
  'case.hill.where': '前川龙贯文公立学校及荃湾川龙村',
  'case.hill.frame': '这个是以往案例参考，用来做有对象、有焦点的评赏。',
  'appreciate.heading': '评赏任务',
  'case.hill.appreciate.object': '评赏对象：参与艺术家陈思光用村内陶土做的陶瓷（川龙泥土陶杯／村内陶土作品）。',
  'case.hill.appreciate.focus': '评赏焦点：陶土与村落、地方和人的关系。',
  'case.hill.appreciate.task': '看官方网页和场刊，写你看到陶土作品怎样连着村落和人。这题不是背景介绍。',
  'case.deepfood.appreciate.object': '评赏对象：油街实现邀请深食的官方计划「唤味：𝑥」。',
  'case.deepfood.appreciate.focus': '评赏焦点：食物、地方、人，和「唤味」邀请。',
  'case.deepfood.appreciate.task': '课堂预设播放官方概览片，只作课堂播放。写你看到食物、地方和人怎样被邀请去「唤味」。',
  'visual.heading': '视觉元素与组织原理',
  'visual.elements.hill': '看陶瓷时可以写物料、质感、形态和颜色：陶土表面、杯形、烧成色泽，与村落环境怎样对比或呼应。',
  'visual.principles.near': '看近身细节时可以写空间、重复和强调：教室走廊、食堂座位排列、校门入口怎样引导视线。',
  'visual.elements.flavour': '看「唤味：𝑥」时可以写空间、色彩、动势和平衡：食物、场地和人怎样被安排去邀请「唤味」。',
  'visual.trial': '短试验可以试物料和质感，再用对比、强调或重复去组织你看到的近身细节。',
  'case.deepfood.project': '唤味：𝑥',
  'video.classroomOnly': '只作课堂播放',
  'video.noDownload': '这课不提供下载、上传或转载。',
} as const

const LESSON_KEYS = [
  'lesson.f4u3l3.title',
  'lesson.f4u3l3.subtitle',
  'lesson.f4u3l3.card.theme.body',
  'lesson.f4u3l3.card.observe.body',
  'lesson.f4u3l3.card.interview.body',
  'lesson.f4u3l3.card.insight.body',
  'lesson.f4u3l3.card.practice.body',
  'lesson.f4u3l4.title',
  'lesson.f4u3l4.subtitle',
  'lesson.f4u3l4.card.make.body',
  'lesson.f4u3l4.card.three.body',
  'lesson.f4u3l4.card.practice.body',
] as const

const BANNED =
  /ArtInSight|洞察藝術|洞察艺术|ArtGPT|Unlock the limit|評分校準|评分校准|開閘|开闸|\bRELAY\b|SENCO|學習需要（SEN）|学习需要（SEN）|讀寫障礙|读写障碍|Dyslexia|ADHD|自閉症|自闭症/

type Card = { title?: string; body?: string; image?: string }
type Lesson = { id: string; title: string; subtitle?: string; cards: Card[] }

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function messages(file: string): Record<string, string> {
  return JSON.parse(read(file)) as Record<string, string>
}

function lesson(file: string, id: string): Lesson {
  const pack = JSON.parse(read(file)) as { units: { lessons: Lesson[] }[] }
  const found = pack.units.flatMap((unit) => unit.lessons).find((item) => item.id === id)
  assert.ok(found, `${file} ${id}`)
  return found
}

describe('November community-art cases', () => {
  it('locks the zh-Hant Soft SCOUT strings, including the four corrected characters', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    for (const [key, value] of Object.entries(HANT)) {
      assert.equal(hant[key], value, key)
    }
    assert.equal(hant['lesson.f4u3l3.subtitle'].includes('\u54A9'), true)
    assert.equal(hant['lesson.f4u3l3.subtitle'].includes('\u54A5'), false)
    assert.equal(hant['lesson.f4u3l4.card.three.body'].includes('\u54A9'), true)
    assert.equal(hant['lesson.f4u3l4.card.three.body'].includes('\u54A5'), false)
    assert.equal(hant['case.hill.title'].codePointAt(0), 0x9082)
    assert.equal(hant['case.hill.title'].includes('\u902E'), false)
    assert.equal(hant['case.hill.where'].includes('\u8343\u7063'), true)
    assert.equal(hant['case.hill.where'].includes('\u834A'), false)
    for (const value of Object.values(HANT)) {
      for (const ch of value) {
        if (ch === '喺') assert.equal(ch.codePointAt(0), 0x55ba)
        if (ch === '唔') assert.equal(ch.codePointAt(0), 0x5514)
        if (ch === '嘅') assert.equal(ch.codePointAt(0), 0x5605)
      }
      assert.equal(value.includes('\u558E'), false)
      assert.equal(value.includes('\u5594'), false)
    }
    assert.equal(hant['case.deepfood.project'], '喚味：\u{1D465}')
    assert.equal(hant['case.deepfood.project'].includes('x'), false)
    assert.equal(hant['video.overviewTitle'].includes('\u{1D465}'), true)
    assert.equal(hant['case.hill.plan'], '策劃 藝術推廣辦事處')
    assert.equal(hant['case.hill.partner'], '在地藝術策劃伙伴 創不同協作')
    assert.equal(hant['case.hill.title'], '邂逅！山 川 人')
    assert.equal([...hant['case.hill.title']][1]?.codePointAt(0), 0x9005)
    const fresh = [
      'case.hill.frame',
      'appreciate.heading',
      'case.hill.appreciate.object',
      'case.hill.appreciate.focus',
      'case.hill.appreciate.task',
      'case.deepfood.appreciate.object',
      'case.deepfood.appreciate.focus',
      'case.deepfood.appreciate.task',
      'visual.heading',
      'visual.elements.hill',
      'visual.principles.near',
      'visual.elements.flavour',
      'visual.trial',
      'lesson.f4u3l3.card.theme.body',
      'lesson.f4u3l3.card.observe.body',
      'lesson.f4u3l3.card.interview.body',
      'lesson.f4u3l3.card.insight.body',
      'lesson.f4u3l3.card.practice.body',
      'lesson.f4u3l4.subtitle',
      'lesson.f4u3l4.card.make.body',
      'lesson.f4u3l4.card.three.body',
      'lesson.f4u3l4.card.practice.body',
      'lesson.goal.hint',
      'lesson.f4u3l3.goal.1',
      'lesson.f4u3l3.goal.2',
      'lesson.f4u3l3.goal.3',
      'lesson.f4u3l4.goal.1',
      'lesson.f4u3l4.goal.2',
      'lesson.f4u3l4.goal.3',
      'lesson.goal.open',
      'criteria.insight.title',
      'criteria.insight.line',
      'criteria.talk.title',
      'criteria.talk.line',
      'criteria.comment.prompt',
      'criteria.comment.placeholder',
      'criteria.note',
    ] as const
    for (const key of fresh) {
      assert.equal(hant[key], HANT[key], key)
      assert.equal(/[\u7684\u628A\u5572]/.test(hant[key]), false, key)
    }
    assert.equal([...hant['case.hill.frame']].some((ch) => ch.codePointAt(0) === 0x569f), true)
    const theme = hant['lesson.f4u3l3.card.theme.body']
    const insight = hant['lesson.f4u3l3.card.insight.body']
    assert.equal(theme.codePointAt(theme.indexOf('真')), 0x771f)
    assert.equal(theme.includes('\u771E'), false)
    assert.equal(theme.codePointAt(theme.indexOf('揀')), 0x63c0)
    assert.equal([...theme].some((ch) => ch.codePointAt(0) === 0x569f), true)
    assert.equal(insight.includes('\u62CE'), true)
    assert.equal(insight.includes('\u62D0'), false)
    assert.equal(insight.includes('\u62C9'), false)
    assert.equal(hant['lesson.f4u3l3.goal.1'].codePointAt(hant['lesson.f4u3l3.goal.1'].indexOf('邂')), 0x9082)
    assert.equal([...hant['lesson.f4u3l3.goal.1']].some((ch) => ch.codePointAt(0) === 0x9005), true)
    assert.equal([...hant['lesson.f4u3l4.goal.1']].some((ch) => ch.codePointAt(0) === 0x1d465), true)
    assert.equal(hant['lesson.f4u3l4.goal.1'].includes('x'), false)
    assert.equal(hant['lesson.f4u3l4.goal.1'].includes('X'), false)
    assert.equal(hant['map.lesson.goal'], '目標')
    assert.deepEqual(
      Object.keys(hant).filter((key) => key.startsWith('trial.')),
      [
        'trial.title',
        'trial.when',
        'trial.do',
        'trial.trace.label',
        'trial.trace.hint',
        'trial.talk.label',
        'trial.disclaimer',
        'trial.noUpload',
      ],
    )
    assert.equal(hant['case.deepfood.appreciate.object'].includes('\u{1D465}'), true)
    assert.equal(hant['case.deepfood.appreciate.object'].includes('x'), false)
    assert.equal(hant['visual.elements.flavour'].includes('\u{1D465}'), true)
    assert.equal(hant['visual.elements.flavour'].includes('x'), false)
    const wrongTitle = ['\u9095\u9005', '\u9088\u9005', '\u9087\u9005', '\u9090\u9005', '\u9089\u9005']
    for (const file of [
      'src/i18n/zh-Hant.json',
      'src/i18n/zh-Hans.json',
      'src/i18n/zh-Hans.overrides.json',
      'src/i18n/en.json',
      'src/components/game/CommunityCases.tsx',
      'src/game/communityCases.ts',
    ]) {
      const source = read(file)
      for (const bad of wrongTitle) assert.equal(source.includes(bad), false, `${file} ${bad}`)
    }
  })

  it('gives en and zh-Hans the same keys, without a diagnostic label', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const hans = messages('src/i18n/zh-Hans.json')
    const en = messages('src/i18n/en.json')
    for (const key of Object.keys(HANT)) {
      assert.equal(typeof hans[key], 'string', `zh-Hans ${key}`)
      assert.equal(typeof en[key], 'string', `en ${key}`)
      assert.ok(hans[key].length > 0)
      assert.ok(en[key].length > 0)
    }
    for (const [key, value] of Object.entries(EN)) assert.equal(en[key], value, key)
    for (const [key, value] of Object.entries(HANS)) assert.equal(hans[key], value, key)
    const overrides = messages('src/i18n/zh-Hans.overrides.json')
    for (const key of Object.keys(HANS)) {
      if (key.startsWith('appreciate.') || key.startsWith('visual.') || key.includes('appreciate') || key === 'case.hill.frame') {
        assert.equal(overrides[key], hans[key], key)
      }
    }
    for (const key of Object.keys(HANT)) {
      if (key.startsWith('criteria.') || key.startsWith('lesson.goal') || key.startsWith('lesson.f4u3l')) {
        assert.equal(overrides[key], hans[key], key)
      }
    }
    assert.equal(en['case.hill.title'], hant['case.hill.title'])
    assert.equal(en['case.deepfood.english'].endsWith('\u{1D465}'), true)
    assert.equal(en['case.deepfood.english'].includes('Flavour: x'), false)
    assert.equal(hans['case.deepfood.english'], 'The Unexplored Flavour: \u{1D465}')
    for (const bag of [hant, hans, en]) {
      for (const key of Object.keys(HANT)) {
        assert.equal(BANNED.test(bag[key]), false, key)
        assert.equal(bag[key].includes('學生例子'), false, key)
        assert.equal(/student example/i.test(bag[key]), false, key)
      }
    }
  })

  it('keeps classroom recognition from sending students out to run a project', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const en = messages('src/i18n/en.json')
    for (const key of LESSON_KEYS) {
      const value = hant[key]
      if (value.includes('出外') || value.includes('實行') || value.includes('去做一個計劃')) {
        assert.equal(value.includes('唔'), true, value)
      }
      assert.equal(/請你出外|必須出外|要你去社區做/.test(value), false, value)
    }
    for (const key of Object.keys(EN)) {
      const value = en[key]
      if (/go out|carry out/i.test(value)) assert.match(value, /do not|does not/i, value)
    }
    assert.match(hant['lesson.f4u3l3.subtitle'], /唔使出外做計劃/)
    assert.match(hant['lesson.f4u3l4.subtitle'], /唔使出外做計劃/)
    assert.equal(hant['lesson.f4u3l3.subtitle'].split('唔使出外').length - 1, 1)
    assert.equal(hant['lesson.f4u3l4.subtitle'].split('唔使出外').length - 1, 1)
    for (const key of LESSON_KEYS) {
      if (key.includes('.card.')) assert.equal(hant[key].includes('唔使出外'), false, key)
    }
    assert.match(hant['case.hill.frame'], /過往案例參考/)
    assert.match(hant['case.deepfood.frame'], /課堂案例/)
    assert.equal(hant['case.hill.artist'].includes('唔係主辦或策劃'), true)
  })

  it('wires both lessons to the locale strings and leaves the other card titles', () => {
    const hant = messages('src/i18n/zh-Hant.json')
    const text = (key: string) => hant[key] ?? key
    const l3 = lesson('src/content/f4-demo.json', 'F4-U3-L3')
    const l4 = lesson('src/content/f4-demo.json', 'F4-U3-L4')
    assert.equal(l3.title, hant['lesson.f4u3l3.title'])
    assert.equal(l3.subtitle, hant['lesson.f4u3l3.subtitle'])
    assert.equal(l4.title, hant['lesson.f4u3l4.title'])
    assert.equal(l4.subtitle, hant['lesson.f4u3l4.subtitle'])
    assert.deepEqual(
      l3.cards.map((card) => card.title),
      ['主題喺社區', '觀察要問准', '短訪問', '拎一個洞察', '課堂練習'],
    )
    assert.deepEqual(
      l4.cards.map((card) => card.title),
      ['研究變創作', '過程要留痕', '學方法唔抄圖', '三句講作品', '課堂練習'],
    )
    assert.equal(l4.cards[1]?.body, '概念發展留痕：文字／圖像草圖、物料試驗、改動原因（研究工作簿用）。')
    assert.equal(l4.cards[2]?.body, '參考風格時：學方法，唔抄圖像；只用合法／自制參考。')
    assert.equal(l3.cards[0]?.image, '/content/learning-map-illustrations/f4-lesson-cards/F4-U3-L3-c0.png')
    assert.equal(l3.cards[2]?.image, undefined)
    assert.equal(l4.cards[0]?.image, '/content/learning-map-illustrations/f4-lesson-cards/F4-U3-L4-c0.png')
    assert.equal(l4.cards[3]?.image, undefined)

    const wired = applyCommunityLessonCopy(
      {
        id: 'F4-U3-L4',
        title: 'old',
        subtitle: 'old',
        cards: l4.cards.map((card) => ({
          title: card.title ?? '',
          body: card.body ?? '',
          easy: ['old'],
          image: card.image,
        })),
      },
      text,
    )
    assert.equal(wired.title, hant['lesson.f4u3l4.title'])
    assert.equal(wired.cards[0]?.body, hant['lesson.f4u3l4.card.make.body'])
    assert.equal(wired.cards[1]?.body, l4.cards[1]?.body)
    assert.equal(wired.cards[1]?.title, '過程要留痕')
    assert.equal(wired.cards[2]?.body, l4.cards[2]?.body)
    assert.equal(wired.cards[3]?.body, hant['lesson.f4u3l4.card.three.body'])
    assert.equal(wired.cards[3]?.image, undefined)
    assert.deepEqual(wired.cards[0]?.easy.join(''), wired.cards[0]?.body.replace(/[，。；：]/g, ''))
    assert.equal(l3.cards[3]?.body, hant['lesson.f4u3l3.card.insight.body'])
    assert.equal(l4.cards[0]?.body, hant['lesson.f4u3l4.card.make.body'])
    assert.equal(l4.cards[4]?.body, hant['lesson.f4u3l4.card.practice.body'])
    assert.deepEqual(communityGoalKeys('F4-U3-L3'), [
      'lesson.f4u3l3.goal.1',
      'lesson.f4u3l3.goal.2',
      'lesson.f4u3l3.goal.3',
    ])
    assert.deepEqual(communityGoalKeys('F4-U3-L4'), [
      'lesson.f4u3l4.goal.1',
      'lesson.f4u3l4.goal.2',
      'lesson.f4u3l4.goal.3',
    ])
    assert.equal(communityGoalKeys('F4-U3-L2'), null)
    assert.equal(communityCardCriteria('F4-U3-L3', 3), 'insight')
    assert.equal(communityCardCriteria('F4-U3-L3', 0), null)
    assert.equal(communityCardCriteria('F4-U3-L4', 0), 'insight')
    assert.equal(communityCardCriteria('F4-U3-L4', 3), 'talk')
    assert.equal(communityCardCriteria('F4-U3-L4', 1), null)

    const builder = read('src/game/f4Demo.ts')
    const player = read('src/components/game/LessonPlayer.tsx')
    assert.match(builder, /applyCommunityLessonCopy/)
    assert.match(player, /CommunityLessonIntro lessonId=\{lesson\.id\} subtitle=\{lesson\.subtitle\}/)
    assert.match(player, /goal: \{ title: 'map\.lesson\.goal', hint: 'map\.lesson\.goalHint' \}/)
    assert.match(player, /<CommunityGoalOutcomes lessonId=\{lesson\.id\} \/>/)
    assert.match(player, /<LessonCardCriteria lessonId=\{lesson\.id\} index=\{index\} \/>/)
    assert.match(player, /<LessonCardCriteria lessonId=\{lessonId\} index=\{cardIdx\} \/>/)
    const surface = read('src/components/game/CommunityCases.tsx')
    const goals = surface.slice(surface.indexOf('function CommunityGoalOutcomes'))
    const criteria = surface.slice(surface.indexOf('function LessonCardCriteria'))
    assert.match(goals, /lesson\.goal\.hint/)
    assert.match(goals, /lesson\.goal\.open/)
    assert.match(goals, /data-lesson-goals/)
    assert.match(criteria, /criteria\.insight\.title/)
    assert.match(criteria, /criteria\.insight\.line/)
    assert.match(criteria, /criteria\.talk\.title/)
    assert.match(criteria, /criteria\.talk\.line/)
    assert.match(criteria, /criteria\.comment\.prompt/)
    assert.match(criteria, /criteria\.comment\.placeholder/)
    assert.match(criteria, /criteria\.note/)
    assert.match(criteria, /data-criteria="insight"/)
    assert.match(criteria, /data-criteria="talk"/)
    assert.match(criteria, /data-criteria-comment/)
    assert.equal(criteria.includes('trial.'), false)
    assert.equal(goals.includes('trial.'), false)
    assert.equal(criteria.includes('worksheet.'), false)
  })

  it('uses the two official cases and only the verified YouTube ids', () => {
    assert.equal(HILL_PAGE_URL, 'https://www.apo.hk/tc/web/apo/hi_hill.html')
    assert.equal(HILL_BROCHURE_URL, 'https://www.apo.hk/documents/27096998/30098408/180326_hihill_brochure_web.pdf')
    assert.equal(DEEPFOOD_PAGE_URL, 'https://www.apo.hk/tc/web/apo/oi_the_unexplored_flavour_x.html')
    assert.equal(HILL_VIDEO_ID, null)
    assert.equal(OVERVIEW_VIDEO_ID, 'hR9X0Ce2r9o')
    assert.deepEqual(
      FURTHER_CLASSROOM_VIDEOS.map((video) => video.id),
      ['ne_jKi_E1m8', 'bNRkL39iQQc', 'THsKZTXt-sk'],
    )
    assert.deepEqual(OFFICIAL_VIDEO_IDS, ['hR9X0Ce2r9o', 'ne_jKi_E1m8', 'bNRkL39iQQc', 'THsKZTXt-sk'])
    assert.equal(classroomEmbedUrl(OVERVIEW_VIDEO_ID), 'https://www.youtube.com/embed/hR9X0Ce2r9o')
    assert.equal(classroomWatchUrl('ne_jKi_E1m8'), 'https://www.youtube.com/watch?v=ne_jKi_E1m8')

    const cases = read('src/game/communityCases.ts')
    const view = read('src/components/game/CommunityCases.tsx')
    const hill = view.slice(view.indexOf('function HillCase'), view.indexOf('function DeepFoodCase'))
    assert.equal(hill.includes('iframe'), false)
    assert.equal(hill.includes('youtube'), false)
    assert.match(hill, /HILL_PAGE_URL/)
    assert.match(hill, /HILL_BROCHURE_URL/)
    assert.equal(cases.includes(HILL_PAGE_URL), true)
    assert.equal(cases.includes(HILL_BROCHURE_URL), true)
    assert.match(view, /src=\{classroomEmbedUrl\(OVERVIEW_VIDEO_ID\)\}/)
    assert.match(cases, /https:\/\/www\.youtube\.com\/embed\/\$\{id\}/)
    assert.equal(view.includes('youtube.com/embed/'), false)
    for (const id of ['hR9X0Ce2r9o', 'ne_jKi_E1m8', 'bNRkL39iQQc', 'THsKZTXt-sk']) {
      assert.equal(cases.includes(id), true, id)
    }
    assert.match(view, /video\.classroomOnly/)
    assert.match(view, /video\.noDownload/)
    assert.equal(view.includes('download='), false)
    assert.equal(/save-offline|repost|rehost/i.test(view), false)
    assert.equal(view.includes('worksheet.'), false)
    const intro = view.slice(view.indexOf('function CommunityLessonIntro'), view.indexOf('function HillCase'))
    assert.match(intro, /data-visual/)
    assert.match(intro, /visual\.elements\.hill/)
    assert.match(intro, /visual\.principles\.near/)
    assert.match(intro, /visual\.elements\.flavour/)
    assert.match(intro, /visual\.trial/)
    const deep = view.slice(view.indexOf('function DeepFoodCase'))
    for (const part of [hill, deep]) {
      const source = part.slice(part.indexOf('data-case-source'), part.indexOf('data-appreciate'))
      const task = part.slice(part.indexOf('data-appreciate'))
      assert.match(source, /data-case-source/)
      assert.equal(source.includes('appreciate.'), false, part.slice(0, 24))
      assert.match(task, /appreciate\.heading/)
      assert.match(task, /data-appreciate/)
    }
    assert.match(hill, /case\.hill\.appreciate\.object/)
    assert.match(hill, /case\.hill\.appreciate\.focus/)
    assert.match(hill, /case\.hill\.appreciate\.task/)
    assert.match(hill, /case\.hill\.frame/)
    assert.match(deep, /case\.deepfood\.appreciate\.object/)
    assert.match(deep, /case\.deepfood\.appreciate\.focus/)
    assert.match(deep, /case\.deepfood\.appreciate\.task/)
    assert.match(view, /#FFF9E9/)
    assert.match(view, /#0D9488/)
    assert.equal(view.includes('loading='), false)
    assert.equal(FURTHER_CLASSROOM_VIDEOS[0]?.title.includes('\u{1D465}'), true)
    assert.equal(FURTHER_CLASSROOM_VIDEOS[1]?.title.includes('Time'), true)
    assert.equal(FURTHER_CLASSROOM_VIDEOS[2]?.title.includes('Space'), true)
  })

  it('leaves LessonCardArt and the api TypeScript count unchanged', () => {
    const art = read('src/components/game/LessonCardArt.tsx')
    const artBlob = createHash('sha1').update(`blob ${Buffer.byteLength(art)}\0${art}`).digest('hex')
    assert.equal(artBlob, '8a19d8c4bff66d05f8bce074478345031a540112')
    assert.match(art, /key=\{image\}/)
    assert.equal(art.includes('loading='), false)
    assert.match(art, /if \(!image \|\| failed\) return null/)
    assert.equal(readdirSync(join(root, 'api')).filter((name) => name.endsWith('.ts')).length, 11)
    const player = read('src/components/game/LessonPlayer.tsx')
    const stage = player.slice(player.indexOf('function CardsStage'), player.indexOf('function QuizStage'))
    assert.match(stage, /LessonCardArt image=\{card\.image\} credit=\{card\.imageCredit\}/)
    assert.equal(stage.includes('loading='), false)
  })
})
