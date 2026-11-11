import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { imageFileIssue } from './cropAskImage.ts'
import {
  bindCropAskStudent,
  cropAskSystem,
  cropSourceRect,
  currentUnitFace,
  displayPhase,
  emptyCropAskStore,
  existingUploadedImage,
  normalizeCrop,
  parseCropAskModelText,
  parseCropAskSections,
  pendingReviewCount,
  postCropAsk,
  readBackgroundDecision,
  referenceAxesForUnit,
  requestGuard,
  reviewDrafts,
  sanitizeCropAskStore,
  staffNeedsNames,
  staffUsesDemo,
  withCropAskAnalysis,
  withCropAskCancel,
  withCropAskConfirmed,
  withCropAskCrop,
  withCropAskFailure,
  withCropAskGenerating,
  withCropAskImage,
  withCropAskUnconfirmed,
  withTeacherSections,
  CROP_ASK_AXES,
  CROP_ASK_KEY,
  type CropAskMeta,
} from './cropAsk.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

const LOCK = {
  "hant": {
    "cropask.title": "局部觀察",
    "cropask.shortTitle": "局部觀察",
    "cropask.intro": "上傳或拍攝一件作品，框選一個局部，就可以得到有結構嘅分析。分析會對齊而家嘅單元，等老師先改或確認。",
    "cropask.disclaimer": "呢份分析係學習支援，唔係公開試或校本正式成績。",
    "cropask.unitLabel": "現有單元",
    "cropask.gradeLabel": "年級",
    "cropask.axisHint": "相關準則（只供參考）",
    "cropask.section.seen": "見到咩",
    "cropask.section.understood": "點樣理解",
    "cropask.section.evidence": "邊啲證據支持",
    "cropask.section.seenHint": "先寫框入面見到嘅嘢，唔好空講感覺。",
    "cropask.section.understoodHint": "寫點樣理解呢個局部，並對齊而家嘅單元。",
    "cropask.section.evidenceHint": "指出框入面邊啲位置或細節支持上面嘅理解。",
    "cropask.entry.cta": "開始局部觀察",
    "cropask.entry.fromUnit": "由而家嘅單元開始",
    "cropask.upload": "上傳圖片",
    "cropask.camera": "拍攝作品",
    "cropask.replaceImage": "換另一張圖",
    "cropask.noImage": "未有圖。上傳或拍攝一件作品之後，先可以框選。",
    "cropask.cameraDenied": "鏡頭權限未開。可以改開權限，或改為上傳圖片。",
    "cropask.imageTypeError": "呢個檔唔係可用嘅圖片。請改用常見圖片格式。",
    "cropask.imageTooLarge": "呢張圖太大。請改用較細嘅圖再試。",
    "cropask.crop.instruction": "喺圖上面框選一個局部。分析會針對呢個框，唔會悄悄改用全圖。",
    "cropask.crop.adjust": "再調框",
    "cropask.crop.clear": "清除框選",
    "cropask.crop.required": "先框選一個局部，先至可以要求分析。",
    "cropask.request": "要求分析",
    "cropask.retry": "再試一次",
    "cropask.cancelRequest": "取消要求",
    "cropask.generating": "正在整理分析草稿，請等一陣。",
    "cropask.failed": "呢次未能完成分析。可以再試一次。呢度唔會造假草稿。",
    "cropask.unavailable": "分析暫時未能用。請稍後再試。",
    "cropask.status.noImage": "未有圖",
    "cropask.status.needCrop": "未框選",
    "cropask.status.generating": "草稿產生中",
    "cropask.status.pending": "待審草稿",
    "cropask.status.edited": "老師已改、未確認",
    "cropask.status.confirmed": "已確認",
    "cropask.status.failed": "未能完成",
    "cropask.pendingNote": "呢份係待審草稿，等老師改或確認之後，先當作學習支援。",
    "cropask.confirmedNote": "老師已確認。呢份分析仍然係學習支援，唔係正式成績，亦唔會自動寫入練習帶。",
    "cropask.emptyDraft": "未有分析草稿。框選一個局部之後，先要求分析。",
    "cropask.staff.blockTitle": "待確認嘅局部觀察",
    "cropask.staff.intro": "睇同學交嚟嘅框選分析草稿。可以改三截正文，再確認。確認後仍然係學習支援，唔當正式成績。",
    "cropask.staff.empty": "暫時未有待確認嘅局部觀察。",
    "cropask.staff.count": "{pending} 份待確認",
    "cropask.staff.edit": "改正文",
    "cropask.staff.saveEdit": "留低修改",
    "cropask.staff.cancelEdit": "取消修改",
    "cropask.staff.confirm": "確認呢份分析",
    "cropask.staff.unconfirm": "返回待審",
    "cropask.staff.student": "校內名稱",
    "cropask.staff.viewRegion": "睇所選局部",
    "cropask.staff.demoNote": "以下係示例名單，唔係真實同學。",
    "cropask.staff.noNames": "未有課室名單。加入校內名稱之後，先可以對稿。",
    "cropask.close": "關閉",
    "cropask.back": "返回",
    "cropask.done": "完成"
  },
  "hans": {
    "cropask.title": "局部观察",
    "cropask.shortTitle": "局部观察",
    "cropask.intro": "上传或拍摄一件作品，框选一个局部，就可以得到有结构的分析。分析会对齐现在的单元，等老师先改或确认。",
    "cropask.disclaimer": "这份分析是学习支援，不是公开试或校本正式成绩。",
    "cropask.unitLabel": "现有单元",
    "cropask.gradeLabel": "年级",
    "cropask.axisHint": "相关准则（只供参考）",
    "cropask.section.seen": "见到什么",
    "cropask.section.understood": "怎样理解",
    "cropask.section.evidence": "哪些证据支持",
    "cropask.section.seenHint": "先写框里面见到的东西，不要空讲感觉。",
    "cropask.section.understoodHint": "写怎样理解这个局部，并对齐现在的单元。",
    "cropask.section.evidenceHint": "指出框里面哪些位置或细节支持上面的理解。",
    "cropask.entry.cta": "开始局部观察",
    "cropask.entry.fromUnit": "从现在的单元开始",
    "cropask.upload": "上传图片",
    "cropask.camera": "拍摄作品",
    "cropask.replaceImage": "换另一张图",
    "cropask.noImage": "未有图。上传或拍摄一件作品之后，才可以框选。",
    "cropask.cameraDenied": "镜头权限未开。可以改开权限，或改为上传图片。",
    "cropask.imageTypeError": "这个文件不是可用的图片。请改用常见图片格式。",
    "cropask.imageTooLarge": "这张图太大。请改用较小的图再试。",
    "cropask.crop.instruction": "在图上面框选一个局部。分析会针对这个框，不会悄悄改用全图。",
    "cropask.crop.adjust": "再调框",
    "cropask.crop.clear": "清除框选",
    "cropask.crop.required": "先框选一个局部，才可以要求分析。",
    "cropask.request": "要求分析",
    "cropask.retry": "再试一次",
    "cropask.cancelRequest": "取消要求",
    "cropask.generating": "正在整理分析草稿，请稍等。",
    "cropask.failed": "这次未能完成分析。可以再试一次。这里不会造假草稿。",
    "cropask.unavailable": "分析暂时未能使用。请稍后再试。",
    "cropask.status.noImage": "未有图",
    "cropask.status.needCrop": "未框选",
    "cropask.status.generating": "草稿生成中",
    "cropask.status.pending": "待审草稿",
    "cropask.status.edited": "老师已改、未确认",
    "cropask.status.confirmed": "已确认",
    "cropask.status.failed": "未能完成",
    "cropask.pendingNote": "这份是待审草稿，等老师改或确认之后，才当作学习支援。",
    "cropask.confirmedNote": "老师已确认。这份分析仍然是学习支援，不是正式成绩，也不会自动写入练习带。",
    "cropask.emptyDraft": "未有分析草稿。框选一个局部之后，再要求分析。",
    "cropask.staff.blockTitle": "待确认的局部观察",
    "cropask.staff.intro": "看同学交来的框选分析草稿。可以改三截正文，再确认。确认后仍然是学习支援，不当正式成绩。",
    "cropask.staff.empty": "暂时未有待确认的局部观察。",
    "cropask.staff.count": "{pending} 份待确认",
    "cropask.staff.edit": "改正文",
    "cropask.staff.saveEdit": "留下修改",
    "cropask.staff.cancelEdit": "取消修改",
    "cropask.staff.confirm": "确认这份分析",
    "cropask.staff.unconfirm": "返回待审",
    "cropask.staff.student": "校内名称",
    "cropask.staff.viewRegion": "看所选局部",
    "cropask.staff.demoNote": "以下是示例名单，不是真实同学。",
    "cropask.staff.noNames": "未有课室名单。加入校内名称之后，才可以对稿。",
    "cropask.close": "关闭",
    "cropask.back": "返回",
    "cropask.done": "完成"
  },
  "en": {
    "cropask.title": "Look closely",
    "cropask.shortTitle": "Look closely",
    "cropask.intro": "Upload or photograph a work, then select a region, to get a structured analysis. It is mapped to the current unit, and a teacher can edit or confirm it first.",
    "cropask.disclaimer": "This analysis is learning support, not an official public-exam or school grade.",
    "cropask.unitLabel": "Current unit",
    "cropask.gradeLabel": "Year",
    "cropask.axisHint": "Related criteria (for reference only)",
    "cropask.section.seen": "What is seen",
    "cropask.section.understood": "How it is understood",
    "cropask.section.evidence": "What evidence supports this",
    "cropask.section.seenHint": "Describe what is inside the selected region, rather than a vague feeling.",
    "cropask.section.understoodHint": "Say how this region can be understood, mapped to the current unit.",
    "cropask.section.evidenceHint": "Point to places or details in the region that support the reading above.",
    "cropask.entry.cta": "Start looking closely",
    "cropask.entry.fromUnit": "Start from the current unit",
    "cropask.upload": "Upload an image",
    "cropask.camera": "Photograph a work",
    "cropask.replaceImage": "Use a different image",
    "cropask.noImage": "No image yet. Upload or photograph a work before you can select a region.",
    "cropask.cameraDenied": "Camera access is off. You can turn it on, or upload an image instead.",
    "cropask.imageTypeError": "This file is not a usable image. Please use a common image format.",
    "cropask.imageTooLarge": "This image is too large. Please try a smaller one.",
    "cropask.crop.instruction": "Select a region on the image. The analysis looks at this region, and will not quietly switch to the whole image.",
    "cropask.crop.adjust": "Adjust the region",
    "cropask.crop.clear": "Clear the region",
    "cropask.crop.required": "Select a region before you can request an analysis.",
    "cropask.request": "Request analysis",
    "cropask.retry": "Try again",
    "cropask.cancelRequest": "Cancel request",
    "cropask.generating": "Preparing a draft analysis. Please wait a moment.",
    "cropask.failed": "The analysis could not be completed this time. You can try again. A fake draft will not be shown.",
    "cropask.unavailable": "Analysis is temporarily unavailable. Please try again later.",
    "cropask.status.noImage": "No image yet",
    "cropask.status.needCrop": "No region yet",
    "cropask.status.generating": "Draft in progress",
    "cropask.status.pending": "Draft awaiting review",
    "cropask.status.edited": "Edited by teacher, not yet confirmed",
    "cropask.status.confirmed": "Confirmed",
    "cropask.status.failed": "Could not complete",
    "cropask.pendingNote": "This is a draft awaiting review. It becomes learning support only after a teacher edits or confirms it.",
    "cropask.confirmedNote": "A teacher has confirmed this. It remains learning support, not an official grade, and it is not written into a practice band.",
    "cropask.emptyDraft": "No analysis draft yet. Select a region, then request an analysis.",
    "cropask.staff.blockTitle": "Look closely, awaiting review",
    "cropask.staff.intro": "Review draft region analyses from the class. You can edit the three sections, then confirm. A confirmed note is still learning support, not an official grade.",
    "cropask.staff.empty": "There are no Look closely drafts awaiting review.",
    "cropask.staff.count": "{pending} awaiting review",
    "cropask.staff.edit": "Edit the text",
    "cropask.staff.saveEdit": "Save edits",
    "cropask.staff.cancelEdit": "Cancel edits",
    "cropask.staff.confirm": "Confirm this analysis",
    "cropask.staff.unconfirm": "Return to review",
    "cropask.staff.student": "In-school name",
    "cropask.staff.viewRegion": "View the selected region",
    "cropask.staff.demoNote": "These are sample names, not real students.",
    "cropask.staff.noNames": "No class list yet. Add an in-school name before you can match a draft.",
    "cropask.close": "Close",
    "cropask.back": "Back",
    "cropask.done": "Done"
  }
}

const META: CropAskMeta = {
  unitId: 'F4-U2-DRAW-DESIGN',
  unitTitle: '寫生、美感同設計思維',
  grade: 'f4',
  studentId: 'demo-a',
  studentKey: 'demo:a',
  demoId: 'a',
  now: '2026-11-11T04:00:00.000Z',
}

const SEEN = '框入面見到一粒淺色圓形，右下方有一抹較深的影子。'
const UNDERSTOOD = '呢個局部可以理解成寫生時對形狀同明暗的觀察。'
const EVIDENCE = '圓形右下的深色塊同左邊轉折，支持上面對形狀同光源的理解。'
const SECTIONS = { seen: SEEN, understood: UNDERSTOOD, evidence: EVIDENCE }

function withPicture() {
  const image = 'data:image/jpeg;base64,' + 'A'.repeat(80)
  return withCropAskImage(emptyCropAskStore(), META, image, 'replace')
}

describe('crop region', () => {
  it('requires a real region and refuses the whole image', () => {
    assert.equal(normalizeCrop(null), null)
    assert.equal(normalizeCrop({ x: 0, y: 0, w: 0.01, h: 0.5 }), null)
    assert.equal(normalizeCrop({ x: 0, y: 0, w: 1, h: 1 }), null)
    assert.equal(normalizeCrop({ x: 0.01, y: 0.01, w: 0.98, h: 0.98 }), null)
    const region = normalizeCrop({ x: 0.2, y: 0.3, w: 0.25, h: 0.4 })
    assert.deepEqual(region, { x: 0.2, y: 0.3, w: 0.25, h: 0.4 })
    assert.equal(cropSourceRect(400, 300, { x: 0, y: 0, w: 1, h: 1 }), null)
    assert.deepEqual(cropSourceRect(400, 300, region), { sx: 80, sy: 90, sw: 100, sh: 120 })
    assert.equal(requestGuard({ hasImage: false, crop: region }), 'noImage')
    assert.equal(requestGuard({ hasImage: true, crop: null }), 'needCrop')
    assert.equal(requestGuard({ hasImage: true, crop: { x: 0, y: 0, w: 1, h: 1 } }), 'needCrop')
    assert.equal(requestGuard({ hasImage: true, crop: region }), 'ok')
  })

  it('reuses an image already uploaded on this device and skips other files', () => {
    assert.equal(existingUploadedImage({ previewUrl: 'blob:http://local/1', mime: 'image/jpeg' }), 'blob:http://local/1')
    assert.equal(existingUploadedImage({ previewUrl: 'blob:http://local/1', mime: 'application/pdf' }), null)
    assert.equal(existingUploadedImage({ previewUrl: null, mime: 'image/png' }), null)
    assert.equal(imageFileIssue({ name: 'notes.pdf', type: 'application/pdf', size: 100 }), 'type')
    assert.equal(imageFileIssue({ name: 'work.png', type: 'image/png', size: 5 * 1024 * 1024 + 1 }), 'large')
    assert.equal(imageFileIssue({ name: 'work.jpg', type: 'image/jpg', size: 1200 }), null)
  })
})

describe('draft library', () => {
  it('keeps one library entry for a unit and never invents text when analysis fails', () => {
    const image = 'data:image/jpeg;base64,' + 'A'.repeat(40)
    const pictured = withCropAskImage(emptyCropAskStore(), META, image, 'replace')
    const draft = pictured.drafts[0]
    assert.equal(draft.status, 'needCrop')
    assert.equal(draft.sections, null)
    assert.deepEqual(draft.axes, ['theme', 'visual'])
    const cropped = withCropAskCrop(pictured, META, { x: 0.2, y: 0.2, w: 0.3, h: 0.3 })
    assert.equal(cropped.drafts[0].status, 'ready')
    const failed = withCropAskFailure(withCropAskGenerating(cropped, META), META, 'unavailable', 'ready')
    assert.equal(failed.drafts[0].status, 'failed')
    assert.equal(failed.drafts[0].sections, null)
    assert.equal(failed.drafts[0].failReason, 'unavailable')
    assert.equal(JSON.stringify(failed).includes('practice-'), false)
    assert.equal(JSON.stringify(failed).includes('"band"'), false)
  })

  it('clears a previous analysis when the region or the image changes', () => {
    let store = withPicture()
    store = withCropAskCrop(store, META, { x: 0.1, y: 0.1, w: 0.4, h: 0.4 })
    store = withCropAskAnalysis(store, META, SECTIONS)
    assert.equal(store.drafts[0].status, 'pending')
    store = withCropAskCrop(store, META, { x: 0.5, y: 0.2, w: 0.2, h: 0.3 })
    assert.equal(store.drafts[0].sections, null)
    assert.equal(store.drafts[0].status, 'ready')
    store = withCropAskAnalysis(store, META, SECTIONS)
    const nextImage = 'data:image/jpeg;base64,' + 'B'.repeat(80)
    store = withCropAskImage(store, META, nextImage, 'replace')
    assert.equal(store.drafts[0].crop, null)
    assert.equal(store.drafts[0].sections, null)
    assert.equal(store.drafts[0].status, 'needCrop')
  })

  it('lets a teacher edit and confirm without writing a practice band', () => {
    let store = withPicture()
    store = withCropAskCrop(store, META, { x: 0.15, y: 0.2, w: 0.35, h: 0.35 })
    store = withCropAskAnalysis(store, META, SECTIONS)
    const id = store.drafts[0].id
    store = withTeacherSections(store, id, { ...SECTIONS, understood: '老師改咗對呢個局部的理解，仍然對齊寫生單元。' })
    assert.equal(store.drafts[0].status, 'edited')
    assert.equal(pendingReviewCount(store), 1)
    store = withCropAskConfirmed(store, id)
    assert.equal(store.drafts[0].status, 'confirmed')
    assert.equal(pendingReviewCount(store), 0)
    assert.equal(reviewDrafts(store)[0].sections.understood.includes('老師改咗'), true)
    assert.equal(JSON.stringify(store).includes('practice-emerging'), false)
    store = withCropAskUnconfirmed(store, id)
    assert.equal(store.drafts[0].status, 'edited')
    const same = withTeacherSections(store, id, SECTIONS)
    assert.equal(same.drafts[0].status, 'pending')
  })

  it('does not accept a model band, a full-frame fallback, or Feldman step names', () => {
    assert.equal(parseCropAskSections({ ...SECTIONS, band: 'practice-secure' }), null)
    assert.equal(parseCropAskModelText(JSON.stringify({ describe: SEEN, analyze: UNDERSTOOD, interpret: EVIDENCE, judge: EVIDENCE })), null)
    assert.deepEqual(parseCropAskModelText(JSON.stringify(SECTIONS)), SECTIONS)
    assert.equal(parseCropAskModelText(JSON.stringify({ ...SECTIONS, seen: '起步' })), null)
    const cancelled = withCropAskCancel(withCropAskGenerating(withCropAskCrop(withPicture(), META, { x: 0.2, y: 0.2, w: 0.3, h: 0.3 }), META), META, 'ready')
    assert.equal(cancelled.drafts[0].status, 'ready')
    assert.equal(cancelled.drafts[0].sections, null)
  })

  it('restores a held draft when a later request cannot finish', () => {
    let store = withPicture()
    store = withCropAskCrop(store, META, { x: 0.2, y: 0.2, w: 0.3, h: 0.3 })
    store = withCropAskAnalysis(store, META, SECTIONS)
    store = withCropAskGenerating(store, META)
    assert.equal(displayPhase(store.drafts[0], true), 'generating')
    store = withCropAskFailure(store, META, 'failed', 'pending')
    assert.equal(store.drafts[0].status, 'pending')
    assert.equal(store.drafts[0].sections?.seen, SEEN)
    assert.equal(store.drafts[0].failReason, 'failed')
    const reloaded = sanitizeCropAskStore({ ...store, drafts: [{ ...store.drafts[0], status: 'generating' }] })
    assert.equal(reloaded.drafts[0].status, 'pending')
  })

  it('uses the open existing unit and official axis names only', () => {
    const units = [
      { id: 'F4-U1-ORIENT', title: '中四視藝入門：課程同 SBA 作品集' },
      { id: 'F4-U2-DRAW-DESIGN', title: '寫生、美感同設計思維' },
    ]
    assert.equal(currentUnitFace(units, null)?.title, '中四視藝入門：課程同 SBA 作品集')
    assert.equal(currentUnitFace(units, 'F4-U2-DRAW-DESIGN')?.title, '寫生、美感同設計思維')
    assert.equal(currentUnitFace([{ id: 'nope', title: '自創單元' }], null), null)
    const axes = referenceAxesForUnit('F4-U2-DRAW-DESIGN')
    assert.deepEqual(axes, ['theme', 'visual'])
    assert.equal(axes.length < CROP_ASK_AXES.length, true)
    assert.deepEqual(referenceAxesForUnit('F4-U1-ORIENT'), ['visual'])
    for (const id of referenceAxesForUnit('not-a-unit')) assert.equal(CROP_ASK_AXES.includes(id), true)
    const f4 = JSON.parse(read('src/content/f4-demo.json')) as { units: { id: string; title: string }[] }
    assert.equal(f4.units.find((unit) => unit.id === 'F4-U2-DRAW-DESIGN')?.title, '寫生、美感同設計思維')
  })

  it('binds in-school names already on the device and marks sample names', () => {
    const demos = [
      { id: 'demo-a', name: '', demoId: 'a' as const },
      { id: 'demo-b', name: '', demoId: 'b' as const },
      { id: 'demo-c', name: '', demoId: 'c' as const },
    ]
    assert.deepEqual(bindCropAskStudent({ activePortfolio: '', students: demos }), {
      studentId: 'demo-a',
      studentKey: 'demo:a',
      demoId: 'a',
    })
    assert.deepEqual(bindCropAskStudent({ activePortfolio: '  陳同學  ', students: demos }), {
      studentId: 'name:陳同學',
      studentKey: '陳同學',
      demoId: null,
    })
    const named = [{ id: 's1', name: '陳同學', demoId: null }]
    assert.equal(bindCropAskStudent({ activePortfolio: '陳同學', students: named }).studentId, 's1')
    assert.equal(staffUsesDemo(demos, []), true)
    assert.equal(staffNeedsNames([], []), true)
    assert.equal(staffNeedsNames(demos, []), false)
  })

  it('posts only the cropped bytes and does not keep a fake body', async () => {
    const seen: unknown[] = []
    const ok = await postCropAsk({
      locale: 'zh-Hant',
      unitTitle: '寫生、美感同設計思維',
      imageBase64: 'aaaa',
      fetchImpl: async (_url, init) => {
        seen.push(JSON.parse(String(init?.body)))
        return new Response(JSON.stringify({ ok: true, ...SECTIONS }), { status: 200 })
      },
    })
    assert.equal(ok.ok, true)
    const body = seen[0] as { mime: string; imageBase64: string; band?: string }
    assert.equal(body.mime, 'image/jpeg')
    assert.equal(body.imageBase64, 'aaaa')
    assert.equal('band' in body, false)
    assert.equal('studentId' in body, false)
    assert.equal('studentName' in body, false)
    assert.equal('sourceImageBase64' in body, false)
    assert.equal(ok.ok, true)
    if (ok.ok) assert.equal(ok.background, null)
    const down = await postCropAsk({
      locale: 'zh-Hant',
      unitTitle: '寫生、美感同設計思維',
      imageBase64: 'aaaa',
      fetchImpl: async () => new Response(JSON.stringify({ ok: false, reason: 'unavailable' }), { status: 503 }),
    })
    assert.deepEqual(down, { ok: false, reason: 'unavailable' })
    const banded = await postCropAsk({
      locale: 'en',
      unitTitle: 'Drawing',
      imageBase64: 'aaaa',
      fetchImpl: async () => new Response(JSON.stringify({ ok: true, ...SECTIONS, band: 'practice-secure' }), { status: 200 }),
    })
    assert.deepEqual(banded, { ok: false, reason: 'failed' })
  })
})

describe('locale and wiring', () => {
  it('matches the locale table in all three languages', () => {
    const files = {
      hant: 'src/i18n/zh-Hant.json',
      hans: 'src/i18n/zh-Hans.json',
      en: 'src/i18n/en.json',
    } as const
    const bags = {
      hant: JSON.parse(read(files.hant)) as Record<string, string>,
      hans: JSON.parse(read(files.hans)) as Record<string, string>,
      en: JSON.parse(read(files.en)) as Record<string, string>,
    }
    for (const locale of ['hant', 'hans', 'en'] as const) {
      for (const [key, value] of Object.entries(LOCK[locale])) {
        assert.equal(bags[locale][key], value, key + ' ' + locale)
        assert.equal(/crop-and-ask|ArtInSight|洞察藝術|洞察艺术|ArtGPT|學生面|学生面|教師面|教师面|S\.4|S\.5|S\.6|\bSoft\b/.test(value), false, key)
      }
    }
    for (const value of Object.values(LOCK.hant)) {
      assert.equal(value.includes('的'), false, value)
      for (const ch of value) {
        if (ch === '嘅') assert.equal(ch.codePointAt(0), 0x5605)
      }
    }
    assert.equal(bags.hant['cropask.disclaimer'], '呢份分析係學習支援，唔係公開試或校本正式成績。')
    assert.equal(bags.hans['cropask.disclaimer'], '这份分析是学习支援，不是公开试或校本正式成绩。')
    assert.equal(bags.en['cropask.disclaimer'], 'This analysis is learning support, not an official public-exam or school grade.')
    assert.equal(bags.hant['tab.staff'], '評分參考')
    assert.equal(bags.hant['inspect.axis.theme'], '主題清晰度')
    assert.equal(bags.hant['inspect.axis.visual'], '視覺表達／結構')
    assert.equal(bags.hant['map.mode.quest'] ?? bags.hant['ux.map1'], '闖關地圖')
  })

  it('puts both tools in the research lab and keeps the queue on the existing staff page', () => {
    const quest = read('src/components/game/MapQuest.tsx')
    const classic = read('src/components/game/LearningMap.tsx')
    const entry = read('src/components/CropAskEntry.tsx')
    const work = read('src/components/CropAskWork.tsx')
    const staff = read('src/components/CropAskStaffQueue.tsx')
    const page = read('src/components/TeacherDraftBand.tsx')
    const store = read('src/lib/useCropAsk.ts')
    const app = read('src/App.tsx')
    const lab = read('src/components/game/ResearchLab.tsx')
    const pair = read('src/components/game/ResearchToolPair.tsx')
    const writer = read('src/components/FeldmanWriter.tsx')
    const easy = read('src/components/easy-read/StepPath.tsx')
    assert.equal(quest.includes('CropAskEntry'), false)
    assert.equal(classic.includes('CropAskEntry'), false)
    assert.equal(quest.includes('cropask.'), false)
    assert.equal(classic.includes('cropask.'), false)
    assert.match(lab, /<ResearchToolPair \/>/)
    assert.match(easy, /<ResearchToolPair \/>/)
    assert.match(pair, /cropask\.title/)
    assert.match(pair, /fw\.title/)
    assert.match(pair, /research\.pair\.hint/)
    assert.match(pair, /cropask\.entry\.cta/)
    assert.match(pair, /research\.pair\.writingCta/)
    assert.equal(pair.includes('評賞工作室'), false)
    assert.equal(pair.includes('評賞空間'), false)
    assert.equal(pair.includes('藝術評賞'), false)
    assert.match(entry, /cropask\.title/)
    assert.match(work, /regionJpegBase64/)
    assert.equal(work.includes('drawImage(img, 0, 0'), false)
    assert.match(work, /cropask\.crop\.required/)
    assert.match(work, /cropask\.disclaimer/)
    assert.match(work, /cropask\.cameraDenied/)
    assert.match(staff, /<CropAskDisclaimer \/>/)
    assert.match(staff, /cropask\.staff\.blockTitle/)
    assert.match(staff, /cropask\.staff\.demoNote/)
    assert.match(staff, /confirmCropAsk/)
    assert.equal(staff.includes('saveTeacherDraft'), false)
    assert.equal(store.includes('saveTeacherDraft'), false)
    assert.equal(store.includes('PRACTICE_BAND'), false)
    assert.match(store, /CROP_ASK_KEY/)
    assert.equal(CROP_ASK_KEY, 'va-nexus:crop-ask:v1')
    const queue = page.indexOf('<CropAskStaffQueue />')
    const overview = page.indexOf('<InspectClassOverview')
    const score = page.indexOf('<SchoolScoreStaff />')
    const dual = page.indexOf('<SchoolScoreDualStaff />')
    const later = page.indexOf('<SchoolScoreLaterStaff />')
    const draft = page.indexOf('<TeacherDraftBandPage')
    assert.ok(queue >= 0 && overview > queue && score > overview && dual > score && later > dual && draft > later)
    assert.match(page, /if \(!role\) return <StaffDenied \/>/)
    assert.equal(app.includes('CropAsk'), false)
    assert.match(work, /cropask\.bringIntoConfirm/)
    assert.match(work, /cropask\.background\.notFound/)
    assert.match(work, /cropask\.background\.foundNote/)
    assert.match(work, /fullJpegBase64/)
    assert.ok(work.indexOf('requestGuard(') < work.lastIndexOf('postCropAsk('))
    assert.equal(work.includes('postFeldmanFeedback'), false)
    assert.equal(work.includes('/api/feedback'), false)
    assert.match(writer, /fw\.toLookClosely/)
    assert.match(writer, /fw\.ai\.gated/)
    assert.match(writer, /fw\.ai\.enable/)
    assert.match(writer, /canUseAi/)
    assert.match(writer, /postFeldmanFeedback/)
    assert.match(writer, /t\('fw\.artwork'\)/)
    assert.equal(writer.includes('cropask.section.seen'), false)
    const surface = [entry, work, pair, writer, quest, classic].join('\n')
    for (const banned of ['crop-and-ask', '學生面', '教師面', '雙圖對讀', '双图对读', 'S.4', 'hearts', 'ArtInSight', 'ArtGPT', 'Lindsay', '96:100']) {
      assert.equal(surface.includes(banned), false, banned)
    }
    assert.equal(work.includes('animate-'), false)
    assert.match(entry, /data-soft-motion="off"/)
    assert.match(pair, /data-soft-motion="off"/)
  })
})

const ADDED = {
  hant: {
    'cropask.background.hint': '若認到呢幅係已知作品，會補背景同作品背後意思；認唔到就只寫框入面見到嘅，唔會估。',
    'cropask.background.checking': '而家先查呢幅上傳圖嘅背景…',
    'cropask.background.foundNote': '呢段「點樣理解」有參考已公開資料嘅作品背景，仍然只係學習支援，唔係正式鑑定。',
    'cropask.background.notFound': '未能確認呢幅係可喺網上搵到嘅已知作品。「點樣理解」只寫框入面見到嘅內容，唔會估作品名或背後意思。',
    'cropask.background.failed': '暫時未能查背景。「點樣理解」只寫框入面見到嘅內容，唔會造假。你可以再試一次。',
    'cropask.toWriting': '去費德曼四步寫作',
    'cropask.bringInto': '帶入「{step}」',
    'cropask.bringIntoOther': '改去其他一步',
    'cropask.bringIntoConfirm': '「{step}」已有文字。確認之後先會寫入，唔會默默覆蓋。',
    'cropask.bringIntoDone': '已帶入「{step}」',
    'cropask.bringIntoEmpty': '呢一截仲未有內容，暫時未能帶入。',
    'research.pair.hint': '局部觀察同費德曼四步寫作放喺呢度一齊用。你可以框選作品局部，再將觀察帶入四步寫作。',
    'research.pair.writingCta': '開始費德曼四步寫作',
    'fw.toLookClosely': '用局部觀察睇呢件作品',
  },
  hans: {
    'cropask.background.hint': '若认到这幅是已知作品，会补背景和作品背后意思；认不到就只写框里面见到的，不会猜。',
    'cropask.background.checking': '现在先查这幅上传图的背景…',
    'cropask.background.foundNote': '这段「怎样理解」有参考已公开资料的作品背景，仍然只是学习支援，不是正式鉴定。',
    'cropask.background.notFound': '未能确认这幅是可在网上找到的已知作品。「怎样理解」只写框里面见到的内容，不会猜作品名或背后意思。',
    'cropask.background.failed': '暂时未能查背景。「怎样理解」只写框里面见到的内容，不会造假。你可以再试一次。',
    'cropask.toWriting': '去费德曼四步写作',
    'cropask.bringInto': '带入「{step}」',
    'cropask.bringIntoOther': '改去其他一步',
    'cropask.bringIntoConfirm': '「{step}」已有文字。确认之后才会写入，不会默默覆盖。',
    'cropask.bringIntoDone': '已带入「{step}」',
    'cropask.bringIntoEmpty': '这一截还没有内容，暂时不能带入。',
    'research.pair.hint': '局部观察和费德曼四步写作放在这里一起用。你可以框选作品局部，再把观察带入四步写作。',
    'research.pair.writingCta': '开始费德曼四步写作',
    'fw.toLookClosely': '用局部观察看这件作品',
  },
  en: {
    'cropask.background.hint': 'If this is a known work, background and meaning are added; if not, only what is seen in the region is written, with no guessing.',
    'cropask.background.checking': 'Checking the background of this uploaded image first…',
    'cropask.background.foundNote': 'This “How it is understood” draws on publicly available background. It is still learning support, not a formal identification.',
    'cropask.background.notFound': 'This could not be confirmed as a known work that can be found online. “How it is understood” only describes what is seen in the region, and does not guess a title or hidden meaning.',
    'cropask.background.failed': 'The background check is unavailable for now. “How it is understood” only describes what is seen in the region, with no invented claims. You can try again.',
    'cropask.toWriting': 'Go to Feldman four-step writing',
    'cropask.bringInto': 'Add to “{step}”',
    'cropask.bringIntoOther': 'Choose a different step',
    'cropask.bringIntoConfirm': '“{step}” already has text. It is added only after you confirm, and is not silently overwritten.',
    'cropask.bringIntoDone': 'Added to “{step}”',
    'cropask.bringIntoEmpty': 'This part is still empty, so it cannot be added yet.',
    'research.pair.hint': 'Look closely and Feldman four-step writing are here together. You can crop a region, then bring those observations into the four steps.',
    'research.pair.writingCta': 'Start Feldman four-step writing',
    'fw.toLookClosely': 'Look closely at this work',
  },
} as const

describe('research pair locale', () => {
  it('adds only the new sentences and leaves the closed contracts in place', () => {
    const bags = {
      hant: JSON.parse(read('src/i18n/zh-Hant.json')) as Record<string, string>,
      hans: JSON.parse(read('src/i18n/zh-Hans.json')) as Record<string, string>,
      en: JSON.parse(read('src/i18n/en.json')) as Record<string, string>,
    }
    for (const locale of ['hant', 'hans', 'en'] as const) {
      for (const [key, value] of Object.entries(ADDED[locale])) {
        assert.equal(bags[locale][key], value, `${locale} ${key}`)
      }
    }
    assert.equal(bags.hant['cropask.section.understood'], '點樣理解')
    assert.equal(bags.hans['cropask.section.understood'], '怎样理解')
    assert.equal(bags.en['cropask.section.understood'], 'How it is understood')
    assert.equal(bags.hant['fw.title'], '費德曼四步寫作')
    assert.equal(bags.hant['fw.artwork'], '評賞作品（選填）')
    assert.equal(bags.hant['fw.ai.title'], 'AI 學習建議')
    assert.equal(bags.hant['fw.ai.enable'], '啟用 AI 學習建議（僅限 18+）')
    assert.equal(bags.hant['fw.ai.gated'], 'AI 學習建議只開放畀已核實 18 歲或以上嘅用戶。寫作框架、檢查清單同術語助推仍然可以用。')
    assert.equal(bags.hant['fw.ai.confirm18'], '我明白評賞文字會傳去 Google Gemini 處理（僅限 18+）。')
    assert.equal(bags.en['fw.ai.gated'], 'AI learning tip is for verified 18+ users. Framework, checklist and terms still work.')
    assert.equal(bags.hant['practice.layer.D'], '描述')
    assert.equal(bags.hant['practice.layer.A'], '分析')
    assert.equal(bags.hant['practice.layer.I'], '詮釋')
    assert.equal(bags.hant['practice.layer.E'], '評價')
    assert.equal(bags.hant['practice.layer.E'].codePointAt(0), 0x8a55)
    assert.equal(bags.hant['practice.layer.E'].codePointAt(1), 0x50f9)
    assert.match(bags.hant['atlas.card.feldman.tip'], /判斷/)
    assert.equal(bags.hant['island.mq.critique.tag'], '費德曼 · 形式分析')
    assert.equal(bags.hant['tab.research'], '研究室')
    assert.equal(bags.en['research.socratic.gateTitle'], undefined)
    assert.equal(bags.en['research.pair.lookCloselyCta'], undefined)
  })
})

const KNOWN = {
  known: true,
  title: 'Starry Night',
  artist: 'Vincent van Gogh',
  background: 'Painted in 1889 at Saint-Rémy.',
  meaning: 'A swirling night sky over a quiet town.',
}

describe('uploaded image background', () => {
  it('keeps a found note only when search results name the work', () => {
    const chunks = [{ uri: 'https://example.test/starry-night', title: 'Starry Night, Vincent van Gogh' }]
    const found = readBackgroundDecision(JSON.stringify(KNOWN), chunks)
    assert.equal(found.status, 'found')
    if (found.status === 'found') assert.equal(found.title, 'Starry Night')
    const unconfirmed = readBackgroundDecision(JSON.stringify(KNOWN), [])
    assert.deepEqual(unconfirmed, { status: 'notFound' })
    const exercise = readBackgroundDecision(
      JSON.stringify({ ...KNOWN, known: false }),
      chunks,
    )
    assert.deepEqual(exercise, { status: 'notFound' })
    assert.deepEqual(readBackgroundDecision('', chunks), { status: 'failed' })
    const blocked = readBackgroundDecision(
      JSON.stringify({ ...KNOWN, meaning: 'This earns a practice-secure band.' }),
      chunks,
    )
    assert.deepEqual(blocked, { status: 'notFound' })
  })

  it('writes background into the understood prompt and refuses invented names when unconfirmed', () => {
    const found = cropAskSystem('en', 'Drawing and design', {
      status: 'found',
      title: 'Starry Night',
      artist: 'Vincent van Gogh',
      background: 'Painted in 1889 at Saint-Rémy.',
      meaning: 'A swirling night sky over a quiet town.',
    })
    assert.match(found, /selected region only/)
    assert.match(found, /Starry Night/)
    assert.match(found, /not a formal identification/)
    assert.match(found, /Drawing and design/)
    const missed = cropAskSystem('zh-Hant', '寫生、美感同設計思維', { status: 'notFound' })
    assert.match(missed, /Do not invent a title/)
    assert.equal(missed.includes('Starry Night'), false)
    assert.match(missed, /cropped region/)
    const failed = cropAskSystem('zh-Hans', '写生', { status: 'failed' })
    assert.match(failed, /Do not invent a title/)
    assert.equal(failed.includes('Vincent van Gogh'), false)
  })

  it('stores the background status on the shared draft and drops it when the region changes', () => {
    let store = withPicture()
    store = withCropAskCrop(store, META, { x: 0.2, y: 0.2, w: 0.3, h: 0.3 })
    store = withCropAskAnalysis(store, META, SECTIONS, 'found')
    assert.equal(store.drafts[0].background, 'found')
    assert.equal(store.drafts[0].status, 'pending')
    const kept = sanitizeCropAskStore(store)
    assert.equal(kept.drafts[0].background, 'found')
    store = withCropAskCrop(store, META, { x: 0.3, y: 0.3, w: 0.3, h: 0.3 })
    assert.equal(store.drafts[0].background, null)
    assert.equal(store.drafts[0].sections, null)
  })
})
