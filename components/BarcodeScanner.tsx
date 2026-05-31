'use client'

import { useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

interface Props {
  onScan: (barcode: string) => void
}

export default function BarcodeScanner({ onScan }: Props) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    )
    scannerRef.current.render(
      (decodedText) => {
        scannerRef.current?.clear()
        onScan(decodedText)
      },
      () => {} // suppress per-frame decode errors
    )
    return () => {
      scannerRef.current?.clear().catch(() => {})
    }
  }, [onScan])

  return <div id="qr-reader" className="w-full" />
}
