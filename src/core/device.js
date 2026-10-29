export function hasWebGL2() {
  try {
    const canvas = document.createElement('canvas')
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// 'high' gets the mirror floor, denser geometry and more particles.
// Append ?quality=low or ?quality=high to the URL to force a tier.
export function detectTier() {
  const forced = new URLSearchParams(window.location.search).get('quality')
  if (forced === 'low' || forced === 'high') return forced
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const small = Math.min(window.innerWidth, window.innerHeight) < 640
  const lowMemory = navigator.deviceMemory !== undefined && navigator.deviceMemory <= 4
  const fewCores = (navigator.hardwareConcurrency || 8) <= 4
  return coarse || small || lowMemory || fewCores ? 'low' : 'high'
}
