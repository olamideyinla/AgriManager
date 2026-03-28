export function trackEvent(name: string, props?: Record<string, string | number>) {
  try {
    if (typeof window !== 'undefined' && (window as unknown as { plausible?: unknown }).plausible) {
      ;(window as unknown as { plausible: (n: string, o: object) => void }).plausible(name, { props })
    }
  } catch {
    // non-fatal
  }
}
