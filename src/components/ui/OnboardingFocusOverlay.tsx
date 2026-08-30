export interface FocusRect {
  bottom: number
  height: number
  left: number
  right: number
  top: number
  width: number
}

export function OnboardingFocusOverlay({ message, rect }: { message: string; rect: FocusRect }) {
  const tooltipTop = rect.bottom + 12

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-30">
        <div className="fixed inset-x-0 top-0 bg-text/55" style={{ height: rect.top }} />
        <div className="fixed bottom-0 left-0 bg-text/55" style={{ top: rect.top, width: rect.left }} />
        <div className="fixed bottom-0 right-0 bg-text/55" style={{ left: rect.right, top: rect.top }} />
        <div className="fixed inset-x-0 bottom-0 bg-text/55" style={{ top: rect.bottom }} />
      </div>
      <p
        aria-live="polite"
        className="fixed z-50 max-w-[calc(100vw-2rem)] bg-surface px-4 py-3 text-sm font-bold leading-6 text-text shadow-lg"
        style={{ left: Math.max(16, rect.left), top: tooltipTop }}
      >
        {message}
      </p>
    </>
  )
}

export function GuestOnboardingFocus({ message, targetId }: { message: string; targetId: string }) {
  const [rect, setRect] = useState<FocusRect | null>(null)

  useEffect(() => {
    function updateRect() {
      const target = document.getElementById(targetId)
      if (!target) {
        setRect(null)
        return
      }

      const next = target.getBoundingClientRect()
      setRect({
        bottom: next.bottom,
        height: next.height,
        left: next.left,
        right: next.right,
        top: next.top,
        width: next.width,
      })
    }

    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [targetId])

  return rect ? <OnboardingFocusOverlay message={message} rect={rect} /> : null
}
import { useEffect, useState } from 'react'
