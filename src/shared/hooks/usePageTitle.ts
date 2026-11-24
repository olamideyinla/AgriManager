import { useEffect } from 'react'
import { updateCanonicalUrl } from './updateCanonicalUrl'

const DEFAULT_TITLE = 'AgriManagerX — Free Farm Management App for Poultry & Crops'

/** Sets document.title, og:title, canonical, and og:url for the current route. */
export function usePageTitle(title: string) {
  useEffect(() => {
    const fullTitle = title ? `${title} — AgriManagerX` : DEFAULT_TITLE
    const prevTitle = document.title
    document.title = fullTitle

    const ogTitle = document.querySelector('meta[property="og:title"]')
    const prevOg = ogTitle?.getAttribute('content')
    ogTitle?.setAttribute('content', fullTitle)

    const restoreCanonical = updateCanonicalUrl()

    return () => {
      document.title = prevTitle
      if (prevOg !== undefined && prevOg !== null) ogTitle?.setAttribute('content', prevOg)
      restoreCanonical()
    }
  }, [title])
}
