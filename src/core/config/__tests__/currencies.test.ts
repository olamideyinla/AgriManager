import { describe, it, expect } from 'vitest'
import { getCurrencyConfig, formatPrice, CURRENCY_MAP } from '../currencies'

describe('getCurrencyConfig', () => {
  it('returns config for known country code', () => {
    const ke = getCurrencyConfig('KE')
    expect(ke.code).toBe('KES')
    expect(ke.symbol).toBe('KSh')
  })

  it('returns DEFAULT config for unknown country', () => {
    const unknown = getCurrencyConfig('XX')
    expect(unknown.code).toBe('USD')
    expect(unknown.symbol).toBe('$')
  })

  it('returns DEFAULT config for DEFAULT key', () => {
    const def = getCurrencyConfig('DEFAULT')
    expect(def.code).toBe('USD')
  })

  it('BR symbol is R$ (not R)', () => {
    const br = getCurrencyConfig('BR')
    expect(br.symbol).toBe('R$')
  })

  it('MX symbol is MX$', () => {
    const mx = getCurrencyConfig('MX')
    expect(mx.symbol).toBe('MX$')
  })

  it('CO symbol is COP$', () => {
    const co = getCurrencyConfig('CO')
    expect(co.symbol).toBe('COP$')
  })

  it('DEFAULT symbol is $', () => {
    const def = getCurrencyConfig('DEFAULT')
    expect(def.symbol).toBe('$')
  })

  it('all entries have pro and x pricing', () => {
    for (const [key, config] of Object.entries(CURRENCY_MAP)) {
      expect(config.pro, `${key} missing pro pricing`).toBeDefined()
      expect(config.x, `${key} missing x pricing`).toBeDefined()
      expect(typeof config.pro.monthly).toBe('number')
      expect(typeof config.pro.annual).toBe('number')
      expect(typeof config.x.annual).toBe('number')
    }
  })
})

describe('formatPrice', () => {
  it('formats USD price with $ symbol before', () => {
    const config = getCurrencyConfig('DEFAULT')
    expect(formatPrice(10, config)).toBe('$10')
  })

  it('formats KES with KSh before and space', () => {
    const config = getCurrencyConfig('KE')
    expect(formatPrice(800, config)).toBe('KSh 800')
  })

  it('formats VND with ₫ after', () => {
    const config = getCurrencyConfig('VN')
    const result = formatPrice(159000, config)
    expect(result).toBe('159.000 ₫')
  })

  it('formats BRL with decimals', () => {
    const config = getCurrencyConfig('BR')
    const result = formatPrice(39.9, config)
    expect(result).toBe('R$ 39,90')
  })

  it('formats NGN without space for single-char symbol', () => {
    const config = getCurrencyConfig('NG')
    expect(formatPrice(5000, config)).toBe('₦5,000')
  })

  it('formats IDR with dot thousands separator', () => {
    const config = getCurrencyConfig('ID')
    expect(formatPrice(99000, config)).toBe('Rp 99.000')
  })
})
