const SITE_ORIGIN = 'https://www.agrimanagerx.com'

/**
 * Points <link rel="canonical"> and <meta property="og:url"> at the current
 * route. Without this every page reports the homepage as canonical, which
 * tells Google every page is a duplicate of "/".
 */
export function updateCanonicalUrl(): () => void {
  const currentUrl = `${SITE_ORIGIN}${window.location.pathname}`

  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  const prevCanonical = canonical?.href
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = currentUrl

  const ogUrl = document.querySelector('meta[property="og:url"]')
  const prevOgUrl = ogUrl?.getAttribute('content')
  ogUrl?.setAttribute('content', currentUrl)

  return () => {
    if (prevCanonical !== undefined) canonical.href = prevCanonical
    if (prevOgUrl !== undefined && prevOgUrl !== null) ogUrl?.setAttribute('content', prevOgUrl)
  }
}
