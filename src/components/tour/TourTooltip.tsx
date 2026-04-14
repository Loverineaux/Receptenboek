'use client'

import { useEffect, useRef, useState } from 'react'

interface TourTooltipProps {
  targetRect: DOMRect | null
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  isFirst: boolean
  isLast: boolean
  isWelcome: boolean
  isFinish: boolean
}

export default function TourTooltip({
  targetRect,
  title,
  description,
  position = 'bottom',
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
  isWelcome,
  isFinish,
}: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const gap = 16

  useEffect(() => {
    if (!tooltipRef.current) return

    const tooltip = tooltipRef.current
    const tw = tooltip.offsetWidth
    const th = tooltip.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Centered modal for welcome/finish (no target)
    if (!targetRect) {
      setPos({
        top: Math.max(16, (vh - th) / 2),
        left: Math.max(16, (vw - tw) / 2),
      })
      return
    }

    // Check which positions have enough space WITHOUT overlapping the target
    const spaceAbove = targetRect.top - gap
    const spaceBelow = vh - targetRect.bottom - gap
    const spaceLeft = targetRect.left - gap
    const spaceRight = vw - targetRect.right - gap

    // Pick the best position: prefer the requested one, fallback to where there's space
    const candidates: Array<'top' | 'bottom' | 'left' | 'right'> = [position]
    if (!candidates.includes('bottom')) candidates.push('bottom')
    if (!candidates.includes('top')) candidates.push('top')
    if (!candidates.includes('left')) candidates.push('left')
    if (!candidates.includes('right')) candidates.push('right')

    let top = 0
    let left = 0
    let placed = false

    for (const dir of candidates) {
      if (dir === 'bottom' && spaceBelow >= th) {
        top = targetRect.bottom + gap
        left = targetRect.left + (targetRect.width - tw) / 2
        placed = true
        break
      } else if (dir === 'top' && spaceAbove >= th) {
        top = targetRect.top - th - gap
        left = targetRect.left + (targetRect.width - tw) / 2
        placed = true
        break
      } else if (dir === 'left' && spaceLeft >= tw) {
        top = targetRect.top + (targetRect.height - th) / 2
        left = targetRect.left - tw - gap
        placed = true
        break
      } else if (dir === 'right' && spaceRight >= tw) {
        top = targetRect.top + (targetRect.height - th) / 2
        left = targetRect.right + gap
        placed = true
        break
      }
    }

    // Last resort: place below, even if it overlaps slightly
    if (!placed) {
      top = targetRect.bottom + gap
      left = targetRect.left + (targetRect.width - tw) / 2
    }

    // Clamp to viewport
    top = Math.max(16, Math.min(top, vh - th - 16))
    left = Math.max(16, Math.min(left, vw - tw - 16))

    setPos({ top, left })
  }, [targetRect, position])

  return (
    <div
      ref={tooltipRef}
      className="fixed w-[calc(100vw-32px)] max-w-[360px] rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
      style={{
        zIndex: 99999,
        top: pos.top,
        left: pos.left,
        transition: 'top 300ms ease-in-out, left 300ms ease-in-out',
      }}
    >
      {/* Title */}
      <h3 className="text-base font-bold text-text-primary">{title}</h3>

      {/* Description */}
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{description}</p>

      {/* Progress dots */}
      {!isWelcome && !isFinish && (
        <div className="mt-4 flex items-center gap-1">
          {Array.from({ length: totalSteps - 2 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep - 1
                  ? 'w-4 bg-primary'
                  : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          {!isWelcome && !isFinish && !isFirst && (
            <button
              onClick={onPrev}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-100"
            >
              Vorige
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isFinish && (
            <button
              onClick={onSkip}
              className="text-xs text-text-muted transition-colors hover:text-text-secondary"
            >
              Overslaan
            </button>
          )}
          <button
            onClick={onNext}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            {isWelcome ? 'Start rondleiding' : isLast ? 'Afronden' : isFinish ? 'Sluiten' : 'Volgende'}
          </button>
        </div>
      </div>
    </div>
  )
}
