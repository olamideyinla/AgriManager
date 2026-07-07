import { useEffect } from 'react'

const DEFAULT_TITLE = 'AgriManagerX — Farm Management App for Poultry, Fish, Crops & Livestock'

/** Sets document.title (and og:title, for any in-app share/PWA surfaces) for the current route. */
export function usePageTitle(title: string) {
  useEffect(() => {
    const fullTitle = title ? `${title} — AgriManagerX` : DEFAULT_TITLE
    const prevTitle = document.title
    document.title = fullTitle

    const ogTitle = document.querySelector('meta[property="og:title"]')
    const prevOg = ogTitle?.getAttribute('content')
    ogTitle?.setAttribute('content', fullTitle)

    return () => {
      document.title = prevTitle
      if (prevOg !== undefined && prevOg !== null) ogTitle?.setAttribute('content', prevOg)
    }
  }, [title])
}
