import { normalizeBarcode } from '@/lib/items'

// Rotate a data-URL image by `degrees` on an offscreen canvas,
// expanding the canvas so corners aren't clipped.
// Applies greyscale + contrast boost to sharpen bar/space boundaries.
export function rotateDataUrl(src: string, degrees: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const rad = (degrees * Math.PI) / 180
      const sin = Math.abs(Math.sin(rad))
      const cos = Math.abs(Math.cos(rad))
      const w = img.width  * cos + img.height * sin
      const h = img.width  * sin + img.height * cos
      const canvas = document.createElement('canvas')
      canvas.width  = Math.ceil(w)
      canvas.height = Math.ceil(h)
      const ctx = canvas.getContext('2d')!
      ctx.filter = 'grayscale(100%) contrast(180%)'
      ctx.translate(w / 2, h / 2)
      ctx.rotate(rad)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.onerror = reject
    img.src = src
  })
}

export function tryDecode(
  Quagga: typeof import('@ericblade/quagga2').default,
  src: string
): Promise<string | null> {
  return new Promise((resolve) => {
    Quagga.decodeSingle(
      {
        src,
        numOfWorkers: 0,
        inputStream: { size: 1200 },
        decoder: {
          readers: [
            'ean_reader', 'ean_8_reader',
            'upc_reader', 'upc_e_reader',
            'code_128_reader', 'code_39_reader',
          ],
        },
        locate: true,
        locator: { patchSize: 'medium', halfSample: false },
      },
      (result) => resolve(result?.codeResult?.code ?? null)
    )
  })
}

// More rotations for uploaded files (unknown orientation);
// fewer for live captures (user is aiming the camera).
export const FILE_ROTATION_ANGLES    = [0, -10, 10, -20, 20, -5, 5]
export const CAPTURE_ROTATION_ANGLES = [0, -5, 5, -10, 10]

export async function decodeImageBarcode(file: File): Promise<string | null> {
  const src: string = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  try {
    const { default: Quagga } = await import('@ericblade/quagga2')
    for (const angle of FILE_ROTATION_ANGLES) {
      const rotated = await rotateDataUrl(src, angle)
      const code    = await tryDecode(Quagga, rotated)
      if (code) return normalizeBarcode(code)
    }
  } catch { /* fall through */ }
  return null
}
