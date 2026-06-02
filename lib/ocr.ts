import { normalizeBarcode } from '@/lib/items'

// EAN-13 checksum: alternating weights 1 and 3 on first 12 digits
function isValidEAN13(code: string): boolean {
  if (code.length !== 13) return false
  const d = code.split('').map(Number)
  const sum = d.slice(0, 12).reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0)
  return (10 - (sum % 10)) % 10 === d[12]
}

// UPC-A checksum: alternating weights 3 and 1 on first 11 digits
function isValidUPCA(code: string): boolean {
  if (code.length !== 12) return false
  const d = code.split('').map(Number)
  const sum = d.slice(0, 11).reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === d[11]
}

// EAN-8 checksum
function isValidEAN8(code: string): boolean {
  if (code.length !== 8) return false
  const d = code.split('').map(Number)
  const sum = d.slice(0, 7).reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === d[7]
}

function isValidBarcode(code: string): boolean {
  return isValidEAN13(code) || isValidUPCA(code) || isValidEAN8(code)
}

// Extract the best candidate barcode from OCR text.
// Tesseract may return extra characters or spaces — scan all digit runs.
function extractBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  // Try the full digit string first, then all substrings of valid barcode lengths
  const candidates: string[] = [digits]
  for (const len of [13, 12, 8]) {
    for (let i = 0; i <= digits.length - len; i++) {
      candidates.push(digits.slice(i, i + len))
    }
  }
  for (const c of candidates) {
    if (isValidBarcode(c)) return c
  }
  return null
}

// Preprocess a canvas crop for OCR:
// - crop the bottom 22% (where digit strip lives on standard barcodes)
// - scale up 3× (OCR accuracy improves significantly at larger sizes)
// - grayscale + high contrast
function preprocessForOCR(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const cropTop = Math.floor(img.height * 0.78) // bottom 22%
      const cropH   = img.height - cropTop
      const scale   = 3
      const canvas  = document.createElement('canvas')
      canvas.width  = img.width  * scale
      canvas.height = cropH      * scale
      const ctx = canvas.getContext('2d')!
      ctx.filter = 'grayscale(100%) contrast(200%)'
      ctx.drawImage(img, 0, cropTop, img.width, cropH, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = src
  })
}

// Run Tesseract OCR on a data URL, return a validated barcode or null.
// Lazy-imports tesseract.js so it's only loaded when actually needed.
export async function decodeWithOCR(src: string): Promise<string | null> {
  try {
    const preprocessed = await preprocessForOCR(src)
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('eng')
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789',
      // Single uniform line of text
      tessedit_pageseg_mode: '7' as never,
    })
    const { data } = await worker.recognize(preprocessed)
    await worker.terminate()

    return extractBarcode(data.text)
      ? normalizeBarcode(extractBarcode(data.text)!)
      : null
  } catch {
    return null
  }
}
