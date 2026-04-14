'use client'

import { useEffect, useState } from 'react'

interface TourOverlayProps {
  targetRect: DOMRect | null
  padding?: number
}

export default function TourOverlay({ targetRect, padding = 8 }: TourOverlayProps) {
  const [rect, setRect] = useState(targetRect)

  useEffect(() => {
    setRect(targetRect)
  }, [targetRect])

  // No spotlight target = full dark overlay
  if (!rect) {
    return (
      <div
        className="fixed inset-0 bg-black/60 transition-opacity duration-300"
        style={{ zIndex: 99998, pointerEvents: 'auto' }}
      />
    )
  }

  const x = rect.left - padding
  const y = rect.top - padding
  const w = rect.width + padding * 2
  const h = rect.height + padding * 2
  const r = 12

  return (
    <svg
      className="fixed inset-0 h-full w-full"
      style={{ zIndex: 99998, pointerEvents: 'none' }}
    >
      <defs>
        <mask id="tour-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={r}
            ry={r}
            fill="black"
            style={{ transition: 'all 300ms ease-in-out' }}
          />
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="rgba(0,0,0,0.6)"
        mask="url(#tour-mask)"
        style={{ pointerEvents: 'auto' }}
      />
    </svg>
  )
}
