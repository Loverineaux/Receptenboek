'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onScanRef = useRef(onScan);
  const scannedRef = useRef(false);
  const scannerRef = useRef<any>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  onScanRef.current = onScan;

  useEffect(() => {
    let mounted = true;
    scannedRef.current = false;

    const startScanner = async () => {
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
            fps: 20,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => ({
              width: Math.floor(viewfinderWidth * 0.85),
              height: Math.floor(viewfinderHeight * 0.4),
            }),
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText: string) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            // Nullify ref BEFORE stopping so cleanup won't try to stop again
            const s = scannerRef.current;
            scannerRef.current = null;
            if (s) {
              s.stop().then(() => s.clear()).catch(() => {});
            }
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
          console.error('[BarcodeScanner] Start error:', err);
          setError('Kan de camera niet starten. Voer de barcode handmatig in.');
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          // Only stop if actually running (state 2 = SCANNING, 3 = PAUSED)
          if (state === 2 || state === 3) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch {
          // Scanner already stopped or cleared — ignore
        }
        try {
          scannerRef.current.clear();
        } catch {
          // Already cleared — ignore
        }
        scannerRef.current = null;
      }
    };
  }, []);

  const handleManualSubmit = () => {
    const trimmed = manualBarcode.trim();
    if (trimmed && !scannedRef.current) {
      scannedRef.current = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
      onScanRef.current(trimmed);
    }
  };

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    onClose();
  };

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-gray-900">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute right-2 top-2 z-20 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
        aria-label="Sluiten"
      >
        <X size={20} />
      </button>

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

        {/* html5-qrcode renders the video + canvas inside this div */}
        <div id="barcode-reader" ref={containerRef} />
      </div>

      {/* Manual barcode input */}
      <div className="border-t border-white/10 p-3">
        <p className="mb-2 text-xs text-white/50">
          Of voer de barcode handmatig in:
        </p>
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
