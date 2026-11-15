/**
 * Efek ripple global untuk tombol biasa (bukan komponen `Button`).
 *
 * Komponen `Button` sudah punya ripple sendiri; tombol mentah seperti ikon
 * header, tab, dan tombol tutup modal akan mendapat efek yang sama lewat
 * event delegation di document.
 */
export function attachGlobalRipple(): () => void {
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    const target = (event.target as HTMLElement | null)?.closest?.('button') as HTMLButtonElement | null
    if (!target || target.disabled || target.dataset.globalRipple === 'off') return
    if (target.dataset.rippleActive === '1') return

    const rect = target.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const size = Math.max(rect.width, rect.height) * 2.2
    const host = document.createElement('span')
    host.className = 'btn-ripple-host'
    host.setAttribute('aria-hidden', 'true')

    const ripple = document.createElement('span')
    ripple.className = 'btn-ripple'
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`
    ripple.style.width = `${size}px`
    ripple.style.height = `${size}px`
    ripple.style.background = getComputedStyle(target).color

    host.appendChild(ripple)

    if (getComputedStyle(target).position === 'static') {
      target.style.position = 'relative'
    }

    target.appendChild(host)
    target.dataset.rippleActive = '1'
    window.setTimeout(() => {
      host.remove()
      delete target.dataset.rippleActive
    }, 650)
  }

  document.addEventListener('pointerdown', onPointerDown, { passive: true })
  return () => document.removeEventListener('pointerdown', onPointerDown)
}
