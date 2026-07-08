import { useEffect } from 'react'
import { updateCanonicalUrl } from './updateCanonicalUrl'

/**
 * Sets document.title, meta description, canonical, and og:url for the
 * current page, restoring the previous values on unmount (so app pages
 * keep the defaults).
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    const ogTitle = document.querySelector('meta[property="og:title"]')
    const prevOgTitle = ogTitle?.getAttribute('content')
    ogTitle?.setAttribute('content', title)

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const prevDescription = meta?.content
    if (description) {
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'description'
        document.head.appendChild(meta)
      }
      meta.content = description
    }

    const ogDescription = document.querySelector('meta[property="og:description"]')
    const prevOgDescription = ogDescription?.getAttribute('content')
    if (description) ogDescription?.setAttribute('content', description)

    const restoreCanonical = updateCanonicalUrl()

    return () => {
      document.title = prevTitle
      if (prevOgTitle !== undefined && prevOgTitle !== null) ogTitle?.setAttribute('content', prevOgTitle)
      if (meta && prevDescription !== undefined) meta.content = prevDescription
      if (prevOgDescription !== undefined && prevOgDescription !== null) ogDescription?.setAttribute('content', prevOgDescription)
      restoreCanonical()
    }
  }, [title, description])
}
