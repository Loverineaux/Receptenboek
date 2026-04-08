'use client';

import { useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface AvatarCropModalProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const size = Math.min(pixelCrop.width, pixelCrop.height);
  // Output at 400x400 for good quality avatars
  const outputSize = 400;
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    size,
    size,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas is empty'))),
      'image/jpeg',
      0.9,
    );
  });
}

export default function AvatarCropModal({ open, imageSrc, onClose, onCropComplete }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropCompleteInternal = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(blob);
    } catch (err) {
      console.error('Crop failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Profielfoto bijsnijden">
      <div className="space-y-4">
        {/* Crop area */}
        <div className="relative mx-auto h-72 w-full overflow-hidden rounded-xl bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropCompleteInternal}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-text-muted transition-colors hover:bg-gray-200 hover:text-text-primary"
            title="Uitzoomen"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 w-32 cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary"
          />

          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-text-muted transition-colors hover:bg-gray-200 hover:text-text-primary"
            title="Inzoomen"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-text-muted transition-colors hover:bg-gray-200 hover:text-text-primary"
            title="Draaien"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuleren
          </Button>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
            Opslaan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
