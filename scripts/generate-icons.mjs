/**
 * Generates the full PWA icon set at public/icons/.
 *
 * The previous icons were flat, unmarked green squares (no logo). This renders
 * a simple "A" monogram so the installed app icon is actually recognizable on
 * a home screen. Run once locally and commit the output — not part of the
 * build pipeline (same reasoning as generate-og-image.mjs: no font/render
 * dependency on the CI image).
 *
 * Usage: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

const GREEN = '#2D6A4F'
const SIZES = [48, 72, 96, 128, 144, 192, 512]
const MASKABLE_SIZES = [192, 512]

/** Standard icon: rounded square, transparent corners, "A" monogram. */
function standardSvg(size) {
  const radius = Math.round(size * 0.18)
  const fontSize = Math.round(size * 0.56)
  const y = Math.round(size * 0.72)
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${GREEN}"/>
  <text x="50%" y="${y}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="${fontSize}" fill="#FFFFFF">A</text>
</svg>`
}

/** Maskable icon: full-bleed background (OS applies its own mask), monogram kept inside the 80% safe zone. */
function maskableSvg(size) {
  const fontSize = Math.round(size * 0.42)
  const y = Math.round(size * 0.58)
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${GREEN}"/>
  <text x="50%" y="${y}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="${fontSize}" fill="#FFFFFF">A</text>
</svg>`
}

async function main() {
  for (const size of SIZES) {
    const file = path.join(outDir, `icon-${size}.png`)
    await sharp(Buffer.from(standardSvg(size))).png().toFile(file)
    console.log(`Generated icon-${size}.png`)
  }
  for (const size of MASKABLE_SIZES) {
    const file = path.join(outDir, `icon-${size}-maskable.png`)
    await sharp(Buffer.from(maskableSvg(size))).png().toFile(file)
    console.log(`Generated icon-${size}-maskable.png`)
  }
}

main()
