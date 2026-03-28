/**
 * Generates solid-color PNG icons for the PWA manifest.
 * Run: node generate-icons.cjs
 */
const { deflateSync } = require('zlib')
const { writeFileSync } = require('fs')

function uint32BE(n) {
  const buf = Buffer.alloc(4)
  buf.writeUInt32BE(n)
  return buf
}

function crc32(data) {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const crcInput = Buffer.concat([typeBytes, data])
  return Buffer.concat([uint32BE(data.length), typeBytes, data, uint32BE(crc32(crcInput))])
}

function solidPNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = chunk('IHDR', Buffer.concat([
    uint32BE(size), uint32BE(size),
    Buffer.from([8, 2, 0, 0, 0]) // 8-bit RGB, no interlace
  ]))

  // Build raw rows: filter byte (0) + RGB pixels
  const row = Buffer.alloc(1 + size * 3)
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r
    row[2 + x * 3] = g
    row[3 + x * 3] = b
  }
  const rows = Buffer.concat(Array.from({ length: size }, () => row))
  const idat = chunk('IDAT', deflateSync(rows, { level: 9 }))
  const iend = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([sig, ihdr, idat, iend])
}

// Primary green: #2D6A4F = rgb(45, 106, 79)
const [r, g, b] = [45, 106, 79]

writeFileSync('public/icons/icon-192.png', solidPNG(192, r, g, b))
writeFileSync('public/icons/icon-512.png', solidPNG(512, r, g, b))
console.log('✓ Generated public/icons/icon-192.png (192×192)')
console.log('✓ Generated public/icons/icon-512.png (512×512)')
