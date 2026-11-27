import { useEffect, useRef, useState } from 'react'
import {
  LEARNING_WORKSHEET_PAGES,
  LEARNING_WORKSHEET_URL,
  learningWorksheetLesson,
} from '../../game/learningWorksheet'
import type { MessageKey } from '../../i18n'
import { BiKey } from './BilingualText'

const ACTIONS = [
  { id: 'preview', label: 'worksheet.preview' },
  { id: 'print', label: 'worksheet.print' },
  { id: 'download', label: 'worksheet.download' },
] as const satisfies readonly { id: 'preview' | 'print' | 'download'; label: MessageKey }[]

type PdfViewport = { width: number; height: number }
type PdfPage = {
  getViewport: (params: { scale: number }) => PdfViewport
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport }) => { promise: Promise<void> }
  cleanup: () => void
}
type PdfDoc = {
  numPages: number
  getPage: (pageNumber: number) => Promise<PdfPage>
  destroy: () => Promise<void>
}
type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument: (src: Record<string, unknown>) => { promise: Promise<PdfDoc>; destroy: () => Promise<void> }
}

let shots: Promise<string[] | null> | null = null

async function renderOfficialPages(): Promise<string[] | null> {
  const pdfjs = (await import('pdfjs-dist')) as unknown as PdfJsModule
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  }
  const task = pdfjs.getDocument({
    url: LEARNING_WORKSHEET_URL,
    verbosity: 0,
    isEvalSupported: false,
  })
  const doc = await task.promise
  if (doc.numPages !== LEARNING_WORKSHEET_PAGES) {
    await doc.destroy()
    return null
  }
  const urls: string[] = []
  try {
    for (let index = 1; index <= doc.numPages; index += 1) {
      const page = await doc.getPage(index)
      try {
        const base = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale: Math.min(2, 1100 / Math.max(base.width, 1)) })
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.ceil(viewport.width))
        canvas.height = Math.max(1, Math.ceil(viewport.height))
        const context = canvas.getContext('2d')
        if (!context) return null
        await page.render({ canvasContext: context, viewport }).promise
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((value) => resolve(value), 'image/png'))
        if (!blob) return null
        urls.push(URL.createObjectURL(blob))
      } finally {
        page.cleanup()
      }
    }
  } finally {
    await doc.destroy()
  }
  return urls.length === LEARNING_WORKSHEET_PAGES ? urls : null
}

function officialPageShots(): Promise<string[] | null> {
  if (typeof document === 'undefined') return Promise.resolve(null)
  if (!shots) shots = renderOfficialPages().catch(() => null)
  return shots
}

/**
 * Original 8-page worksheet. Buttons reuse the live preview, print, and download labels.
 * Page images are the file itself. They are not a hand-in control.
 */
export function LearningWorksheetFile() {
  const [mode, setMode] = useState<(typeof ACTIONS)[number]['id']>('preview')
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState<string[] | null | undefined>(undefined)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const printRef = useRef(false)

  useEffect(() => {
    let live = true
    void officialPageShots().then((next) => {
      if (live) setPages(next)
    })
    return () => {
      live = false
    }
  }, [])

  function choose(next: (typeof ACTIONS)[number]['id']) {
    if (next === 'print') {
      setMode('print')
      printRef.current = true
      const frame = frameRef.current
      if (!frame) return
      if (frame.src.endsWith(LEARNING_WORKSHEET_URL) && frame.contentWindow) {
        frame.contentWindow.focus()
        frame.contentWindow.print()
        return
      }
      frame.src = LEARNING_WORKSHEET_URL
      return
    }
    if (next === 'download') {
      setMode('download')
      const link = document.createElement('a')
      link.href = LEARNING_WORKSHEET_URL
      link.download = 'f4-community-art-learning-worksheet.pdf'
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
      return
    }
    setMode('preview')
  }

  const current = pages?.[page] ?? ''

  return (
    <section
      data-learning-worksheet="official"
      data-learning-worksheet-pages={LEARNING_WORKSHEET_PAGES}
      data-soft-motion="off"
      className="space-y-3 rounded-3xl border-2 border-[#0D9488] bg-[#FFF9E9] p-4"
    >
      <div data-learning-worksheet-toolbar className="space-y-2">
        <div role="group" className="flex flex-wrap gap-2">
          {ACTIONS.map((item) => {
            const selected = mode === item.id
            return (
              <button
                key={item.id}
                type="button"
                data-learning-worksheet-action={item.id}
                data-selected={selected ? 'true' : 'false'}
                aria-pressed={selected}
                onClick={() => choose(item.id)}
                className={
                  selected
                    ? 'inline-flex min-h-9 items-center rounded-full border border-[#0D9488] bg-[#0D9488] px-4 py-1.5 text-left text-sm font-semibold text-[#FFF9E9]'
                    : 'inline-flex min-h-9 items-center rounded-full border border-[#0D9488] bg-white px-4 py-1.5 text-left text-sm font-semibold text-[#0D9488]'
                }
              >
                <BiKey name={item.label} />
              </button>
            )
          })}
        </div>
        <p className="text-sm text-slate-600">
          <BiKey name="worksheet.printHint" />
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#0D9488]/30 bg-white">
        {current ? (
          <img src={current} alt="" data-learning-worksheet-page={page + 1} className="mx-auto max-h-[70vh] w-full object-contain" />
        ) : pages === null ? (
          <object data={LEARNING_WORKSHEET_URL} type="application/pdf" className="h-[70vh] w-full" />
        ) : (
          <div className="mx-auto aspect-[612/792] w-full max-w-xl bg-white" />
        )}
      </div>
      {pages && pages.length > 0 ? (
        <ol className="m-0 grid list-none grid-cols-4 gap-2 p-0 sm:grid-cols-8">
          {pages.map((url, index) => {
            const selected = index === page
            return (
              <li key={url}>
                <button
                  type="button"
                  data-learning-worksheet-thumb={index + 1}
                  aria-pressed={selected}
                  onClick={() => {
                    setPage(index)
                    setMode('preview')
                  }}
                  className={
                    selected
                      ? 'w-full rounded-xl border-2 border-[#0D9488] bg-white p-1'
                      : 'w-full rounded-xl border border-[#0D9488]/30 bg-white p-1'
                  }
                >
                  <img src={url} alt="" className="h-16 w-full object-contain sm:h-20" />
                  <span className="mt-1 block text-center text-xs font-semibold text-[#0D9488]">{index + 1}</span>
                </button>
              </li>
            )
          })}
        </ol>
      ) : null}
      <iframe
        ref={frameRef}
        title={LEARNING_WORKSHEET_URL}
        className="pointer-events-none fixed h-px w-px opacity-0"
        onLoad={() => {
          if (!printRef.current) return
          printRef.current = false
          const frame = frameRef.current?.contentWindow
          frame?.focus()
          frame?.print()
        }}
      />
    </section>
  )
}

export function LearningWorksheetForLesson({ lessonId }: { lessonId: string }) {
  if (!learningWorksheetLesson(lessonId)) return null
  return <LearningWorksheetFile />
}
