/**
 * Generates the static Open Graph / Twitter Card share image at public/og-image.png.
 *
 * Run once locally and commit the resulting PNG — this is NOT part of the build
 * pipeline. Regenerating on every Vercel build would depend on fonts being present
 * on the build image, which isn't guaranteed; a committed static asset removes
 * that risk entirely and matches what social crawlers expect (a stable, cacheable
 * file at a fixed URL).
 *
 * Usage: node scripts/generate-og-image.mjs
 */
import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.resolve(__dirname, '../public/og-image.png')

const WIDTH = 1200
const HEIGHT = 630

const FEATURES = [
  'Track production, feed & mortality',
  'See profit per flock, pond, or harvest',
  'Works offline — syncs when connected',
  'Free to start. No credit card required.',
]

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2D6A4F" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#1B4332" stop-opacity="1"/>
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="#1B4332"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${WIDTH}" height="6" fill="#DAA520"/>

  <text x="80" y="170" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="72" fill="#FFFFFF">AgriManagerX</text>
  <text x="80" y="222" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="32" fill="#DAA520">Farm smarter, grow faster.</text>

  ${FEATURES.map((line, i) => `
  <text x="80" y="${320 + i * 52}" font-family="Helvetica, Arial, sans-serif" font-size="27" fill="rgba(255,255,255,0.92)">${esc(line)}</text>
  `).join('')}

  <!-- Phone mockup -->
  <rect x="880" y="100" width="240" height="430" rx="24" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3"/>
  <rect x="892" y="130" width="216" height="380" rx="12" fill="rgba(255,255,255,0.08)"/>

  <rect x="905" y="150" width="190" height="50" rx="8" fill="#22C55E"/>
  <text x="920" y="182" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="16" fill="#FFFFFF">87.2% Production</text>

  <rect x="905" y="215" width="190" height="50" rx="8" fill="#DAA520"/>
  <text x="920" y="247" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="16" fill="#1B4332">Revenue up 18%</text>

  <rect x="905" y="280" width="190" height="80" rx="8" fill="rgba(255,255,255,0.15)"/>
  ${[35, 50, 40, 60, 55, 70, 65].map((h, i) => `<rect x="${915 + i * 25}" y="${340 - h}" width="18" height="${h}" fill="rgba(45,106,79,0.9)"/>`).join('')}

  <rect x="0" y="${HEIGHT - 60}" width="${WIDTH}" height="60" fill="rgba(255,255,255,0.12)"/>
  <text x="${WIDTH / 2}" y="${HEIGHT - 22}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.75)">agrimanagerx.com</text>
</svg>
`

const buffer = await sharp(Buffer.from(svg)).png().toBuffer()
writeFileSync(outPath, buffer)
console.log(`Generated ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`)
