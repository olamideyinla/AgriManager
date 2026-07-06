import { useEffect } from 'react'

/**
 * Sets document.title and the meta description for the current page,
 * restoring the previous values on unmount (so app pages keep the defaults).
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

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

    return () => {
      document.title = prevTitle
      if (meta && prevDescription !== undefined) meta.content = prevDescription
    }
  }, [title, description])
}
