'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Quagga from '@ericblade/quagga2'
import { CameraIcon, RefreshCw } from 'lucide-react'
import { normalizeBarcode } from '@/lib/items'

interface Props {
  onScan: (barcode: string) => void
}

const CONFIRM_THRESHOLD = 3   // detections needed before accepting
const BLACK_SCREEN_MS  = 2500 // ms to wait before declaring camera unavailable

export default function BarcodeScanner({ onScan }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const scanned       = useRef(false)
  const detections    = useRef<Record<string, number>>({})

  const [cameras,       setCameras]       = useState<MediaDeviceInfo[]>([])
  const [activeCamIdx,  setActiveCamIdx]  = useState(0)
  const [cameraError,   setCameraError]   = useState(false)

  // Cycle to next camera, skip if only one
  const cycleCamera = useCallback(() => {
    setCameras(prev => {
      if (prev.length < 2) return prev
      setActiveCamIdx(i => (i + 1) % prev.length)
      return prev
    })
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    scanned.current    = false
    detections.current = {}
    setCameraError(false)

    const camera = cameras[activeCamIdx]
    const constraints: MediaTrackConstraints = camera
      ? { deviceId: { exact: camera.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
      : { facingMode: 'environment',             width: { ideal: 1280 }, height: { ideal: 720 } }

    let blackScreenTimer: ReturnType<typeof setTimeout> | null = null

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
        locate:  true,
        locator: { patchSize: 'medium', halfSample: true },
        frequency:    10,
        numOfWorkers: typeof navigator !== 'undefined'
          ? Math.min(navigator.hardwareConcurrency ?? 2, 4)
          : 2,
      },
      (err) => {
        if (err) {
          setCameraError(true)
          return
        }
        Quagga.start()

        // Detect black/frozen stream — Samsung ultrawide/telephoto cameras
        // open without error but produce zero-size frames
        blackScreenTimer = setTimeout(() => {
          const video = containerRef.current?.querySelector('video')
          if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
            setCameraError(true)
          }
        }, BLACK_SCREEN_MS)

        // Enumerate cameras after permission granted (labels now available)
        navigator.mediaDevices.enumerateDevices()
          .then(devs => {
            const vids = devs.filter(d => d.kind === 'videoinput')
            setCameras(prev => {
              // Only set on first population so we don't reset activeCamIdx
              if (prev.length > 0) return prev
              // Default active camera: first rear/environment match
              const rearIdx = vids.findIndex(d => /back|rear|environment/i.test(d.label))
              if (rearIdx > 0) setActiveCamIdx(rearIdx)
              return vids
            })
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

      // Reject low-confidence reads (helps filter Quagga2 misreads)
      const errors = result.codeResult?.decodedCodes
        ?.filter(x => x.error !== undefined)
        .map(x => x.error as number) ?? []
      if (errors.length > 0) {
        const sorted  = [...errors].sort((a, b) => a - b)
        const median  = sorted[Math.floor(sorted.length / 2)]
        if (median > 0.20) return  // tighter than before
      }

      // Require CONFIRM_THRESHOLD consistent detections of the same code
      // before accepting — prevents one-shot EAN-8 misreads of EAN-13 barcodes
      detections.current[code] = (detections.current[code] ?? 0) + 1
      if (detections.current[code] < CONFIRM_THRESHOLD) return

      scanned.current = true
      if (blackScreenTimer) clearTimeout(blackScreenTimer)
      Quagga.stop()
      onScan(normalizeBarcode(code))
    }

    Quagga.onDetected(handleDetected)

    return () => {
      if (blackScreenTimer) clearTimeout(blackScreenTimer)
      Quagga.offDetected(handleDetected)
      Quagga.stop()
    }
  }, [activeCamIdx, onScan]) // cameras deliberately excluded — index is the driver

  const cameraLabel = cameras[activeCamIdx]?.label?.replace(/\s*\(.*\)/, '') || null

  return (
    <div
      ref={containerRef}
      className="w-full relative overflow-hidden rounded-2xl bg-black"
      style={{ aspectRatio: '4/3' }}
    >
      {/* Camera switch button — only shown when multiple cameras available */}
      {cameras.length > 1 && !cameraError && (
        <button
          type="button"
          onClick={cycleCamera}
          className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5
            bg-black/50 hover:bg-black/70 active:scale-95 transition-all
            text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl backdrop-blur-sm cursor-pointer
            max-w-[45%] truncate"
          aria-label="Switch camera"
          title={cameraLabel ?? undefined}
        >
          <CameraIcon size={13} className="flex-shrink-0" />
          <span className="truncate">
            {cameraLabel ?? `${activeCamIdx + 1}/${cameras.length}`}
          </span>
        </button>
      )}

      {/* Black screen / unavailable camera overlay */}
      {cameraError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center
          bg-black/85 rounded-2xl gap-3 px-6 text-center">
          <CameraIcon size={28} className="text-white/40" />
          <p className="text-white text-sm font-semibold">Camera unavailable</p>
          <p className="text-white/50 text-xs">
            This camera can&apos;t be accessed by the browser.
          </p>
          {cameras.length > 1 && (
            <button
              type="button"
              onClick={cycleCamera}
              className="flex items-center gap-2 mt-1 bg-white/15 hover:bg-white/25
                text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw size={13} />
              Try next camera
            </button>
          )}
        </div>
      )}
    </div>
  )
}
