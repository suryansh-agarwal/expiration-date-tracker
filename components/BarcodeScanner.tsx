'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Quagga from '@ericblade/quagga2'
import { CameraIcon, RefreshCw } from 'lucide-react'
import { normalizeBarcode } from '@/lib/items'
import { rotateDataUrl, tryDecode, CAPTURE_ROTATION_ANGLES } from '@/lib/barcode'

interface Props {
  onScan: (barcode: string) => void
}

type CaptureState = 'idle' | 'capturing' | 'not_found'

const CONFIRM_THRESHOLD = 3
const BLACK_SCREEN_MS   = 2500

export default function BarcodeScanner({ onScan }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scanned      = useRef(false)
  const detections   = useRef<Record<string, number>>({})

  const [cameras,       setCameras]       = useState<MediaDeviceInfo[]>([])
  const [activeCamIdx,  setActiveCamIdx]  = useState(0)
  const [cameraError,   setCameraError]   = useState(false)
  const [captureState,  setCaptureState]  = useState<CaptureState>('idle')

  const cycleCamera = useCallback(() => {
    setCameras(prev => {
      if (prev.length < 2) return prev
      setActiveCamIdx(i => (i + 1) % prev.length)
      return prev
    })
  }, [])

  // Capture current video frame, preprocess, and try to decode
  const captureFrame = useCallback(async () => {
    if (captureState !== 'idle' || scanned.current) return
    const video = containerRef.current?.querySelector('video') as HTMLVideoElement | null
    if (!video || video.videoWidth === 0) return

    setCaptureState('capturing')

    // Draw the live frame to an offscreen canvas at full resolution
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    const src = canvas.toDataURL('image/jpeg', 0.95)

    // Try with contrast preprocessing + multiple rotation angles
    for (const angle of CAPTURE_ROTATION_ANGLES) {
      const preprocessed = await rotateDataUrl(src, angle)
      const code = await tryDecode(Quagga, preprocessed)
      if (code) {
        scanned.current = true
        Quagga.stop()
        setCaptureState('idle')
        onScan(normalizeBarcode(code))
        return
      }
    }

    // Nothing found — flash feedback then resume normal scanning
    setCaptureState('not_found')
    setTimeout(() => setCaptureState('idle'), 1800)
  }, [captureState, onScan])

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
            'ean_reader', 'ean_8_reader',
            'upc_reader', 'upc_e_reader',
            'code_128_reader', 'code_39_reader',
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
        if (err) { setCameraError(true); return }
        Quagga.start()

        blackScreenTimer = setTimeout(() => {
          const video = containerRef.current?.querySelector('video') as HTMLVideoElement | null
          if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
            setCameraError(true)
          }
        }, BLACK_SCREEN_MS)

        navigator.mediaDevices.enumerateDevices()
          .then(devs => {
            const vids = devs.filter(d => d.kind === 'videoinput')
            setCameras(prev => {
              if (prev.length > 0) return prev
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

      const errors = result.codeResult?.decodedCodes
        ?.filter(x => x.error !== undefined)
        .map(x => x.error as number) ?? []
      if (errors.length > 0) {
        const sorted = [...errors].sort((a, b) => a - b)
        if (sorted[Math.floor(sorted.length / 2)] > 0.20) return
      }

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
  }, [activeCamIdx, onScan])

  const cameraLabel = cameras[activeCamIdx]?.label?.replace(/\s*\(.*\)/, '') || null

  return (
    <div
      ref={containerRef}
      className="w-full relative overflow-hidden rounded-2xl bg-black"
      style={{ aspectRatio: '4/3' }}
    >
      {/* Camera switch button */}
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

      {/* Shutter / capture button */}
      {!cameraError && (
        <div className="absolute bottom-3 inset-x-0 flex flex-col items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={captureFrame}
            disabled={captureState === 'capturing'}
            aria-label="Capture frame"
            className={`w-14 h-14 rounded-full border-4 flex items-center justify-center
              transition-all duration-150 active:scale-90 cursor-pointer shadow-lg
              ${captureState === 'not_found'
                ? 'border-red-400 bg-red-500/30'
                : 'border-white bg-white/20 hover:bg-white/30'
              }
              ${captureState === 'capturing' ? 'opacity-60' : ''}`}
          >
            {captureState === 'capturing' ? (
              <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <span className={`w-9 h-9 rounded-full transition-colors
                ${captureState === 'not_found' ? 'bg-red-400' : 'bg-white'}`}
              />
            )}
          </button>
          {captureState === 'not_found' && (
            <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
              No barcode found — keep trying
            </span>
          )}
        </div>
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
