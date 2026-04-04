'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        if (!mounted || !scannerRef.current) return;

        const scannerId = 'barcode-scanner-region';
        scannerRef.current.id = scannerId;

        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText: string) => {
            // On successful scan
            html5QrCode.stop().catch(() => {});
            onScan(decodedText);
          },
          () => {
            // Ignore scan failures (no barcode in frame)
          }
        );

        if (mounted) setIsStarting(false);
      } catch (err: any) {
        if (!mounted) return;
        setIsStarting(false);

        if (
          err?.message?.includes('Permission') ||
          err?.name === 'NotAllowedError'
        ) {
          setError(
            'Camera-toegang geweigerd. Sta cameratoegang toe in je browserinstellingen of voer de barcode handmatig in.'
          );
        } else if (
          err?.message?.includes('NotFoundError') ||
          err?.name === 'NotFoundError'
        ) {
          setError(
            'Geen camera gevonden. Voer de barcode handmatig in.'
          );
        } else {
          setError(
            'Kan de camera niet starten. Voer de barcode handmatig in.'
          );
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        html5QrCodeRef.current.clear().catch(() => {});
        html5QrCodeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSubmit = () => {
    const trimmed = manualBarcode.trim();
    if (trimmed) {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
      onScan(trimmed);
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-gray-900">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-2 top-2 z-20 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
        aria-label="Sluiten"
      >
        <X size={20} />
      </button>

      {/* Camera area */}
      <div className="relative aspect-square w-full overflow-hidden sm:aspect-video">
        {isStarting && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <p className="text-sm text-white/70">Camera starten...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900 px-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <span className="text-xl">📷</span>
              </div>
              <p className="text-sm text-white/80">{error}</p>
            </div>
          </div>
        )}

        {/* Scanner container */}
        <div ref={scannerRef} className="h-full w-full" />

        {/* Viewfinder overlay */}
        {!error && (
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="flex h-full w-full items-center justify-center">
              <div className="relative h-[250px] w-[250px]">
                {/* Corner brackets */}
                <div className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-white" />
                <div className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-white" />
                <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-white" />
                <div className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-white" />

                {/* Scanning line animation */}
                <div className="absolute left-2 right-2 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-green-400/60" />
              </div>
            </div>

            {/* Hint text */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-xs text-white/60">
                Richt de camera op de barcode
              </p>
            </div>
          </div>
        )}
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
            placeholder="Bijv. 8710400000000"
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
