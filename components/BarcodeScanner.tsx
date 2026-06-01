'use client'

import { useEffect, useRef } from 'react'
import Quagga from '@ericblade/quagga2'

interface Props {
  onScan: (barcode: string) => void
}

export default function BarcodeScanner({ onScan }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scanned = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return
    scanned.current = false

    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: containerRef.current,
          constraints: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'upc_reader',
            'upc_e_reader',
            'code_128_reader',
            'code_39_reader',
          ],
        },
        locate: true,
        locator: {
          patchSize: 'medium',
          halfSample: true,
        },
        frequency: 10,
        numOfWorkers: typeof navigator !== 'undefined'
          ? Math.min(navigator.hardwareConcurrency ?? 2, 4)
          : 2,
      },
      (err) => {
        if (err) {
          console.error('Quagga init error:', err)
          return
        }
        Quagga.start()
      }
    )

    function handleDetected(result: { codeResult?: { code?: string | null; decodedCodes?: { error?: number }[] } }) {
      if (scanned.current) return
      const code = result?.codeResult?.code
      if (!code) return

      // Only accept if median error across detected segments is low enough
      const errors = result.codeResult?.decodedCodes
        ?.filter(x => x.error !== undefined)
        .map(x => x.error as number) ?? []
      if (errors.length > 0) {
        const median = errors.slice().sort((a, b) => a - b)[Math.floor(errors.length / 2)]
        if (median > 0.25) return
      }

      scanned.current = true
      Quagga.stop()
      onScan(code)
    }

    Quagga.onDetected(handleDetected)

    return () => {
      Quagga.offDetected(handleDetected)
      Quagga.stop()
    }
  }, [onScan])

  return (
    <div
      ref={containerRef}
      className="w-full relative overflow-hidden rounded-2xl bg-black"
      style={{ aspectRatio: '4/3' }}
    >
      {/* Quagga mounts its <video> and <canvas> here */}
    </div>
  )
}
