/**
 * One JPEG per official PDF page.
 * Used when a raw scan of embedded JPEG streams does not line up with the
 * page count: missing streams, JPX or Flate pages, or extra thumbnails.
 * A shorter list is not returned. The caller treats that as unsent.
 */

type CanvasSurface = {
  toBuffer?: (mime: 'image/jpeg', quality?: number) => Uint8Array
  toBlob?: (callback: (blob: Blob | null) => void, type?: string, quality?: number) => void
}

type CanvasEntry = {
  canvas: CanvasSurface
  context: unknown
}

type PdfViewport = { width: number; height: number }

type PdfPage = {
  getViewport: (params: { scale: number }) => PdfViewport
  render: (params: { canvasContext: unknown; viewport: PdfViewport }) => { promise: Promise<void> }
  cleanup: () => void
}

type PdfDoc = {
  numPages: number
  canvasFactory: {
    create: (width: number, height: number) => CanvasEntry
    destroy: (entry: CanvasEntry) => void
  }
  getPage: (pageNumber: number) => Promise<PdfPage>
  destroy: () => Promise<void>
}

type LoadingTask = {
  promise: Promise<PdfDoc>
  destroy: () => Promise<void>
}

type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument: (src: Record<string, unknown>) => LoadingTask
}

async function loadPdfJs(): Promise<PdfJsModule> {
  if (typeof document === 'undefined') {
    const specifier = 'pdfjs-dist/legacy/build/pdf.mjs'
    return (await import(/* @vite-ignore */ specifier)) as unknown as PdfJsModule
  }
  return (await import('pdfjs-dist')) as unknown as PdfJsModule
}

async function configureWorker(pdfjs: PdfJsModule): Promise<void> {
  if (pdfjs.GlobalWorkerOptions.workerSrc) return
  if (typeof document === 'undefined') {
    const moduleName = 'node:module'
    const urlName = 'node:url'
    const nodeModule = (await import(/* @vite-ignore */ moduleName)) as {
      createRequire: (filename: string) => { resolve: (id: string) => string }
    }
    const nodeUrl = (await import(/* @vite-ignore */ urlName)) as {
      pathToFileURL: (path: string) => { href: string }
    }
    const require = nodeModule.createRequire(import.meta.url)
    pdfjs.GlobalWorkerOptions.workerSrc = nodeUrl.pathToFileURL(
      require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs'),
    ).href
    return
  }
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
}

async function canvasToJpeg(canvas: CanvasSurface): Promise<Uint8Array | null> {
  if (typeof canvas.toBuffer === 'function') {
    const buffer = canvas.toBuffer('image/jpeg', 72)
    return buffer.byteLength > 0 ? new Uint8Array(buffer) : null
  }
  if (typeof canvas.toBlob !== 'function') return null
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob?.((value) => resolve(value), 'image/jpeg', 0.72)
  })
  if (!blob || blob.size === 0) return null
  return new Uint8Array(await blob.arrayBuffer())
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

async function renderPage(doc: PdfDoc, pageNumber: number, maxEdge: number): Promise<Uint8Array | null> {
  const page = await doc.getPage(pageNumber)
  try {
    const base = page.getViewport({ scale: 1 })
    const longest = Math.max(base.width, base.height, 1)
    const viewport = page.getViewport({ scale: Math.min(1, maxEdge / longest) })
    const width = Math.max(1, Math.ceil(viewport.width))
    const height = Math.max(1, Math.ceil(viewport.height))
    const entry = doc.canvasFactory.create(width, height)
    try {
      await page.render({ canvasContext: entry.context, viewport }).promise
      const jpeg = await canvasToJpeg(entry.canvas)
      return jpeg && isJpeg(jpeg) ? jpeg : null
    } finally {
      doc.canvasFactory.destroy(entry)
    }
  } finally {
    page.cleanup()
  }
}

/** Rasterize every page. Null when the page count cannot be met in full. */
export async function rasterizePdfPages(
  bytes: Uint8Array,
  pageCount: number,
  maxEdge: number,
): Promise<Uint8Array[] | null> {
  if (pageCount < 1 || bytes.byteLength === 0 || maxEdge < 1) return null
  let pdfjs: PdfJsModule
  try {
    pdfjs = await loadPdfJs()
    await configureWorker(pdfjs)
  } catch {
    return null
  }
  const data = new Uint8Array(bytes.byteLength)
  data.set(bytes)
  let task: LoadingTask | null = null
  let doc: PdfDoc | null = null
  try {
    task = pdfjs.getDocument({
      data,
      verbosity: 0,
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
      stopAtErrors: false,
    })
    doc = await task.promise
    if (doc.numPages !== pageCount) return null
    const pages: Uint8Array[] = []
    for (let index = 1; index <= doc.numPages; index += 1) {
      const jpeg = await renderPage(doc, index, maxEdge)
      if (!jpeg) return null
      pages.push(jpeg)
    }
    return pages.length === pageCount ? pages : null
  } catch {
    return null
  } finally {
    try {
      if (doc) await doc.destroy()
      else await task?.destroy()
    } catch {
      /* The document is already closed. */
    }
  }
}
