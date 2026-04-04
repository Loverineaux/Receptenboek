'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Zap } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const scannedRef = useRef(false);
  const scannerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [manualBarcode, setManualBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isNative, setIsNative] = useState(false);

  onScanRef.current = onScan;

  useEffect(() => {
    let mounted = true;
    scannedRef.current = false;

    const handleDetection = (barcode: string) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      onScanRef.current(barcode);
    };

    const startScanner = async () => {
      // Strategy 1: Native BarcodeDetector (Chrome Android — fast like native apps)
      if ('BarcodeDetector' in window) {
        try {
          const BD = (window as any).BarcodeDetector;
          const formats = await BD.getSupportedFormats();
          const wanted = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'].filter(f => formats.includes(f));

          if (wanted.length > 0) {
            const detector = new BD({ formats: wanted });

            // Get camera
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
              audio: false,
            });

            if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
            streamRef.current = stream;

            const video = videoRef.current!;
            video.srcObject = stream;
            await video.play();

            if (mounted) {
              setIsStarting(false);
              setIsNative(true);
            }

            // Scan every frame — as fast as possible
            const detect = async () => {
              if (!mounted || scannedRef.current) return;
              try {
                const barcodes = await detector.detect(video);
                if (barcodes.length > 0 && !scannedRef.current) {
                  handleDetection(barcodes[0].rawValue);
                  return;
                }
              } catch {}
              rafRef.current = requestAnimationFrame(detect);
            };
            rafRef.current = requestAnimationFrame(detect);
            return; // Native scanner running
          }
        } catch {
          // BarcodeDetector failed, fall through to html5-qrcode
        }
      }

      // Strategy 2: html5-qrcode fallback (iOS, desktop, older browsers)
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

        if (!mounted || !containerRef.current) return;

        const scanner = new Html5Qrcode('barcode-reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 30,
            qrbox: (vw: number, vh: number) => ({
              width: Math.floor(vw * 0.9),
              height: Math.floor(vh * 0.5),
            }),
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText: string) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            const s = scannerRef.current;
            scannerRef.current = null;
            if (s) s.stop().then(() => s.clear()).catch(() => {});
            onScanRef.current(decodedText);
          },
          () => {},
        );

        if (mounted) setIsStarting(false);
      } catch (err: any) {
        if (!mounted) return;
        setIsStarting(false);
        if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
          setError('Camera-toegang geweigerd. Sta cameratoegang toe of voer de barcode handmatig in.');
        } else if (err?.name === 'NotFoundError') {
          setError('Geen camera gevonden. Voer de barcode handmatig in.');
        } else {
          setError('Kan de camera niet starten. Voer de barcode handmatig in.');
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      // Cleanup native stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      // Cleanup html5-qrcode
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2 || state === 3) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch {}
        try { scannerRef.current.clear(); } catch {}
        scannerRef.current = null;
      }
    };
  }, []);

  const stopAll = () => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (scannerRef.current) {
      try { scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
  };

  const handleManualSubmit = () => {
    const trimmed = manualBarcode.trim();
    if (trimmed && !scannedRef.current) {
      scannedRef.current = true;
      stopAll();
      onScanRef.current(trimmed);
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-gray-900">
      {/* Close button */}
      <button
        onClick={() => { stopAll(); onClose(); }}
        className="absolute right-2 top-2 z-20 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
        aria-label="Sluiten"
      >
        <X size={20} />
      </button>

      {/* Native API indicator */}
      {isNative && (
        <div className="absolute left-2 top-2 z-20 flex items-center gap-1 rounded-full bg-green-500/80 px-2 py-0.5 text-[10px] font-medium text-white">
          <Zap size={10} /> Snel
        </div>
      )}

      {/* Camera area */}
      <div className="relative w-full overflow-hidden">
        {isStarting && !error && (
          <div className="flex aspect-square items-center justify-center bg-gray-900 sm:aspect-video">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <p className="text-sm text-white/70">Camera starten...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex aspect-square items-center justify-center bg-gray-900 px-6 sm:aspect-video">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <span className="text-xl">📷</span>
              </div>
              <p className="text-sm text-white/80">{error}</p>
            </div>
          </div>
        )}

        {/* Native scanner: our own video element */}
        <video
          ref={videoRef}
          className={`h-full w-full object-cover ${isNative ? '' : 'hidden'}`}
          style={isNative ? { aspectRatio: '4/3' } : undefined}
          playsInline
          muted
          autoPlay
        />

        {/* html5-qrcode fallback: it renders its own video inside this div */}
        <div id="barcode-reader" ref={containerRef} className={isNative ? 'hidden' : ''} />

        {/* Viewfinder overlay for native scanner */}
        {isNative && !isStarting && (
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute left-1/2 top-1/2 h-[100px] w-[280px] -translate-x-1/2 -translate-y-1/2 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]">
              <div className="absolute -left-px -top-px h-5 w-5" style={{ borderWidth: '3px 0 0 3px', borderStyle: 'solid', borderColor: 'white' }} />
              <div className="absolute -right-px -top-px h-5 w-5" style={{ borderWidth: '3px 3px 0 0', borderStyle: 'solid', borderColor: 'white' }} />
              <div className="absolute -bottom-px -left-px h-5 w-5" style={{ borderWidth: '0 0 3px 3px', borderStyle: 'solid', borderColor: 'white' }} />
              <div className="absolute -bottom-px -right-px h-5 w-5" style={{ borderWidth: '0 3px 3px 0', borderStyle: 'solid', borderColor: 'white' }} />
              <div className="absolute left-2 right-2 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-red-500/70" />
            </div>
            <div className="absolute bottom-3 left-0 right-0 text-center">
              <p className="text-xs font-medium text-white/70">Richt op de barcode</p>
            </div>
          </div>
        )}
      </div>

      {/* Manual barcode input */}
      <div className="border-t border-white/10 p-3">
        <p className="mb-2 text-xs text-white/50">Of voer de barcode handmatig in:</p>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
            placeholder="Bijv. 5449000000996"
            className="flex-1 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleManualSubmit}
            disabled={!manualBarcode.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            Zoeken
          </button>
        </div>
      </div>
    </div>
  );
}
