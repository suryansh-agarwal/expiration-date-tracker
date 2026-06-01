'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Quagga from '@ericblade/quagga2'
import { CameraIcon } from 'lucide-react'
import { normalizeBarcode } from '@/lib/items'

interface Props {
  onScan: (barcode: string) => void
}

export default function BarcodeScanner({ onScan }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scanned = useRef(false)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null)

  const cycleCamera = useCallback(() => {
    if (cameras.length < 2) return
    const idx = cameras.findIndex(c => c.deviceId === activeCameraId)
    const next = cameras[(idx + 1) % cameras.length]
    setActiveCameraId(next.deviceId)
  }, [cameras, activeCameraId])

  useEffect(() => {
    if (!containerRef.current) return
    scanned.current = false

    const constraints: MediaTrackConstraints = activeCameraId
      ? { deviceId: { exact: activeCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
      : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }

    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: containerRef.current,
          constraints,
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
        locator: { patchSize: 'medium', halfSample: true },
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
        // Enumerate cameras after permission is granted (labels are available now)
        navigator.mediaDevices.enumerateDevices()
          .then(devs => {
            const videoDevices = devs.filter(d => d.kind === 'videoinput')
            setCameras(videoDevices)
            // If no explicit camera chosen yet, record which one is active
            if (!activeCameraId && videoDevices.length > 0) {
              // Prefer rear camera if identifiable by label
              const rear = videoDevices.find(d =>
                /back|rear|environment/i.test(d.label)
              )
              if (rear) setActiveCameraId(rear.deviceId)
            }
          })
          .catch(() => {})
      }
    )

    function handleDetected(result: {
      codeResult?: { code?: string | null; decodedCodes?: { error?: number }[] }
    }) {
      if (scanned.current) return
      const code = result?.codeResult?.code
      if (!code) return

      const errors = result.codeResult?.decodedCodes
        ?.filter(x => x.error !== undefined)
        .map(x => x.error as number) ?? []
      if (errors.length > 0) {
        const sorted = [...errors].sort((a, b) => a - b)
        const median = sorted[Math.floor(sorted.length / 2)]
        if (median > 0.25) return
      }

      scanned.current = true
      Quagga.stop()
      onScan(normalizeBarcode(code))
    }

    Quagga.onDetected(handleDetected)

    return () => {
      Quagga.offDetected(handleDetected)
      Quagga.stop()
    }
  }, [activeCameraId, onScan])

  return (
    <div
      ref={containerRef}
      className="w-full relative overflow-hidden rounded-2xl bg-black"
      style={{ aspectRatio: '4/3' }}
    >
      {cameras.length > 1 && (
        <button
          type="button"
          onClick={cycleCamera}
          className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5
            bg-black/50 hover:bg-black/70 active:scale-95 transition-all
            text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl backdrop-blur-sm cursor-pointer"
          aria-label="Switch camera"
        >
          <CameraIcon size={13} />
          {cameras.findIndex(c => c.deviceId === activeCameraId) + 1}/{cameras.length}
        </button>
      )}
    </div>
  )
}
