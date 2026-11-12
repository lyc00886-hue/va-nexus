/** Worker asset URL used when a PDF page is rasterized in the browser. */
declare module '*?url' {
  const src: string
  export default src
}

declare module 'jpeg-js' {
  export type JpegImage = {
    width: number
    height: number
    data: Uint8Array
  }

  export function decode(
    buffer: Uint8Array,
    options?: {
      useTArray?: boolean
      formatAsRGBA?: boolean
      maxMemoryUsageInMB?: number
      maxResolutionInMP?: number
    },
  ): JpegImage

  export function encode(image: JpegImage, quality: number): JpegImage
}
