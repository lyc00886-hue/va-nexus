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
