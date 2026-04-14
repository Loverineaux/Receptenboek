'use client'

import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { tourSteps } from './tourSteps'
import TourOverlay from './TourOverlay'
import TourTooltip from './TourTooltip'

interface TourContextValue {
  startTour: () => void
  isActive: boolean
}

export const TourContext = createContext<TourContextValue>({ startTour: () => {}, isActive: false })

export default function TourProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [firstRecipeId, setFirstRecipeId] = useState<string | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const elevatedRef = useRef<HTMLElement | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStartedRef = useRef(false)

  const step = tourSteps[currentStep]

  // Resolve dynamic selectors
  const resolveSelector = useCallback((selector: string | null): string | null => {
    if (!selector) return null
    if (selector === '__responsive_nav__') {
      return window.innerWidth >= 768 ? '[data-tour="desktop-nav"]' : '[data-tour="mobile-nav"]'
    }
    return selector
  }, [])

  // Resolve page path for dynamic pages
  const resolvePage = useCallback((page: string): string => {
    if (page === '__first_recipe__' && firstRecipeId) {
      return `/recepten/${firstRecipeId}`
    }
    return page
  }, [firstRecipeId])

  // Get first recipe ID
  useEffect(() => {
    if (!isActive || firstRecipeId) return
    const card = document.querySelector('[data-tour="recipe-card"]')
    if (card) {
      const id = card.getAttribute('data-recipe-id')
      if (id) setFirstRecipeId(id)
    }
  }, [isActive, pathname, firstRecipeId])

  // Elevate target element above overlay
  const elevateTarget = useCallback((el: HTMLElement | null) => {
    if (elevatedRef.current) {
      elevatedRef.current.style.removeProperty('position')
      elevatedRef.current.style.removeProperty('z-index')
      elevatedRef.current = null
    }
    if (el) {
      const computed = window.getComputedStyle(el)
      if (computed.position === 'static') {
        el.style.position = 'relative'
      }
      el.style.zIndex = '99998'
      elevatedRef.current = el
    }
  }, [])

  // Navigate to page, click tab if needed, poll for target, then show
  useEffect(() => {
    if (!isActive || !step) return

    const targetPage = resolvePage(step.page)
    const needsNavigation = pathname !== targetPage

    // Navigate if needed
    if (needsNavigation) {
      router.push(targetPage)
    }

    // Clear old poll
    if (pollRef.current) clearInterval(pollRef.current)

    let attempts = 0
    const maxAttempts = 40 // 8 seconds
    let clickedTab = false

    pollRef.current = setInterval(() => {
      attempts++

      // Wait for navigation to complete
      if (needsNavigation && attempts < 10) {
        // Check if we've actually navigated
        const currentPath = window.location.pathname
        if (currentPath !== targetPage) return
      }

      // Click tab button if step requires it (and only once)
      if (step.clickBefore && !clickedTab) {
        const tabBtn = document.querySelector<HTMLElement>(step.clickBefore)
        if (tabBtn) {
          tabBtn.click()
          clickedTab = true
          // Give the tab content time to render
          return
        }
      }

      // No target needed (modal steps)
      const selector = resolveSelector(step.targetSelector)
      if (!selector) {
        setTargetRect(null)
        elevateTarget(null)
        setTransitioning(false)
        if (pollRef.current) clearInterval(pollRef.current)
        return
      }

      const el = document.querySelector<HTMLElement>(selector)
      if (el) {
        // Scroll into view if needed
        const rect = el.getBoundingClientRect()
        const inView = rect.top >= 0 && rect.bottom <= window.innerHeight
        if (!inView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => {
            setTargetRect(el.getBoundingClientRect())
            elevateTarget(el)
            setTransitioning(false)
          }, 500)
        } else {
          setTargetRect(el.getBoundingClientRect())
          elevateTarget(el)
          setTransitioning(false)
        }
        if (pollRef.current) clearInterval(pollRef.current)
      } else if (attempts >= maxAttempts) {
        // Timeout: skip this step
        if (pollRef.current) clearInterval(pollRef.current)
        setCurrentStep((prev) => Math.min(prev + 1, tourSteps.length - 1))
      }
    }, 200)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [isActive, currentStep, pathname, step, resolvePage, resolveSelector, elevateTarget, router])

  // Recalculate position on resize/scroll
  useEffect(() => {
    if (!isActive || transitioning) return

    const handleUpdate = () => {
      const selector = resolveSelector(step?.targetSelector ?? null)
      if (!selector) return
      const el = document.querySelector<HTMLElement>(selector)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
      }
    }

    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate, true)
    return () => {
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate, true)
    }
  }, [isActive, transitioning, step, resolveSelector])

  // Keyboard: Escape to skip
  useEffect(() => {
    if (!isActive) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') completeTour()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive])

  // Auto-start tour for new users
  useEffect(() => {
    if (autoStartedRef.current) return
    if (!user || !profile) return
    if (profile.has_completed_tour) return
    if (localStorage.getItem('tour-completed') === 'true') return
    if (pathname !== '/recepten') return

    const timer = setTimeout(() => {
      const hasCards = document.querySelector('[data-tour="recipe-card"]')
      if (hasCards) {
        autoStartedRef.current = true
        startTour()
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [user, profile, pathname])

  const startTour = useCallback(() => {
    setCurrentStep(0)
    setFirstRecipeId(null)
    setTransitioning(false)
    setIsActive(true)
    elevateTarget(null)
    if (pathname !== '/recepten') {
      router.push('/recepten')
    }
  }, [pathname, router, elevateTarget])

  const completeTour = useCallback(async () => {
    setIsActive(false)
    setTargetRect(null)
    setTransitioning(false)
    elevateTarget(null)
    setCurrentStep(0)

    localStorage.setItem('tour-completed', 'true')
    if (user) {
      const supabase = createClient()
      await supabase.from('profiles').update({ has_completed_tour: true }).eq('id', user.id)
    }
  }, [user, elevateTarget])

  const nextStep = useCallback(() => {
    if (currentStep >= tourSteps.length - 1) {
      completeTour()
      return
    }
    // Hide tooltip during transition (don't reset targetRect — keeps overlay stable)
    setTransitioning(true)
    elevateTarget(null)
    setCurrentStep((prev) => prev + 1)
  }, [currentStep, completeTour, elevateTarget])

  const prevStep = useCallback(() => {
    if (currentStep <= 0) return
    setTransitioning(true)
    elevateTarget(null)
    setCurrentStep((prev) => prev - 1)
  }, [currentStep, elevateTarget])

  const isWelcome = step?.id === 'welcome'
  const isFinish = step?.id === 'finish'
  const isFirst = currentStep === 0
  const isLast = currentStep === tourSteps.length - 2

  return (
    <TourContext.Provider value={{ startTour, isActive }}>
      {children}
      {isActive && step && (
        <>
          <TourOverlay
            targetRect={transitioning ? null : targetRect}
            padding={step.padding}
          />
          {!transitioning && (
            <TourTooltip
              targetRect={targetRect}
              title={step.title}
              description={step.description}
              position={step.position}
              currentStep={currentStep}
              totalSteps={tourSteps.length}
              onNext={isFinish ? completeTour : nextStep}
              onPrev={prevStep}
              onSkip={completeTour}
              isFirst={isFirst}
              isLast={isLast}
              isWelcome={isWelcome}
              isFinish={isFinish}
            />
          )}
        </>
      )}
    </TourContext.Provider>
  )
}
