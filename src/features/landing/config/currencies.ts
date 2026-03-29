export type CurrencyConfig = {
  code: string
  symbol: string
  symbolPosition: 'before' | 'after'
  thousandsSeparator: string
  decimalSeparator: string
  decimals: number
  monthlyFree: number
  monthlyGrowth: number
  annualGrowth: number
  annualSavingsPct: number
  exampleEggPrice: string
  exampleRevenue: string
  exampleCostPerEgg: string
}

export const CURRENCY_MAP: Record<string, CurrencyConfig> = {

  // ── East Africa ───────────────────────────────────────────────────────────────
  KE: {
    code: 'KES', symbol: 'KSh', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 1200, annualGrowth: 10000, annualSavingsPct: 31,
    exampleEggPrice: 'KSh 350 per tray',
    exampleRevenue: 'KSh 312,000', exampleCostPerEgg: 'KSh 12.50',
  },
  TZ: {
    code: 'TZS', symbol: 'TSh', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 18000, annualGrowth: 150000, annualSavingsPct: 31,
    exampleEggPrice: 'TSh 8,000 per tray',
    exampleRevenue: 'TSh 7,200,000', exampleCostPerEgg: 'TSh 290',
  },
  UG: {
    code: 'UGX', symbol: 'USh', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 30000, annualGrowth: 250000, annualSavingsPct: 31,
    exampleEggPrice: 'USh 12,000 per tray',
    exampleRevenue: 'USh 9,600,000', exampleCostPerEgg: 'USh 420',
  },
  RW: {
    code: 'RWF', symbol: 'FRw', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 7000, annualGrowth: 60000, annualSavingsPct: 29,
    exampleEggPrice: 'FRw 4,500 per tray',
    exampleRevenue: 'FRw 3,600,000', exampleCostPerEgg: 'FRw 150',
  },
  ET: {
    code: 'ETB', symbol: 'Br', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 600, annualGrowth: 5000, annualSavingsPct: 31,
    exampleEggPrice: 'Br 200 per tray',
    exampleRevenue: 'Br 160,000', exampleCostPerEgg: 'Br 7',
  },

  // ── West Africa ───────────────────────────────────────────────────────────────
  NG: {
    code: 'NGN', symbol: '₦', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 15000, annualGrowth: 120000, annualSavingsPct: 33,
    exampleEggPrice: '₦2,500 per crate',
    exampleRevenue: '₦2,400,000', exampleCostPerEgg: '₦85',
  },
  GH: {
    code: 'GHS', symbol: 'GH₵', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 100, annualGrowth: 800, annualSavingsPct: 33,
    exampleEggPrice: 'GH₵ 45 per crate',
    exampleRevenue: 'GH₵ 36,000', exampleCostPerEgg: 'GH₵ 1.50',
  },
  SN: {
    code: 'XOF', symbol: 'FCFA', symbolPosition: 'after',
    thousandsSeparator: '.', decimalSeparator: ',', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 5000, annualGrowth: 40000, annualSavingsPct: 33,
    exampleEggPrice: '2,500 FCFA per tray',
    exampleRevenue: '1,920,000 FCFA', exampleCostPerEgg: '85 FCFA',
  },
  CI: {
    code: 'XOF', symbol: 'FCFA', symbolPosition: 'after',
    thousandsSeparator: '.', decimalSeparator: ',', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 5000, annualGrowth: 40000, annualSavingsPct: 33,
    exampleEggPrice: '2,500 FCFA per tray',
    exampleRevenue: '1,920,000 FCFA', exampleCostPerEgg: '85 FCFA',
  },
  CM: {
    code: 'XAF', symbol: 'FCFA', symbolPosition: 'after',
    thousandsSeparator: '.', decimalSeparator: ',', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 5000, annualGrowth: 40000, annualSavingsPct: 33,
    exampleEggPrice: '2,500 FCFA per tray',
    exampleRevenue: '1,920,000 FCFA', exampleCostPerEgg: '85 FCFA',
  },

  // ── Southern Africa ───────────────────────────────────────────────────────────
  ZA: {
    code: 'ZAR', symbol: 'R', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 150, annualGrowth: 1200, annualSavingsPct: 33,
    exampleEggPrice: 'R 55 per tray',
    exampleRevenue: 'R 44,000', exampleCostPerEgg: 'R 1.80',
  },
  ZM: {
    code: 'ZMW', symbol: 'ZK', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 250, annualGrowth: 2000, annualSavingsPct: 33,
    exampleEggPrice: 'ZK 120 per tray',
    exampleRevenue: 'ZK 96,000', exampleCostPerEgg: 'ZK 4.20',
  },
  MW: {
    code: 'MWK', symbol: 'MK', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 12000, annualGrowth: 100000, annualSavingsPct: 31,
    exampleEggPrice: 'MK 6,000 per tray',
    exampleRevenue: 'MK 4,800,000', exampleCostPerEgg: 'MK 200',
  },

  // ── Middle East / North Africa ────────────────────────────────────────────────
  EG: {
    code: 'EGP', symbol: 'EGP', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 400, annualGrowth: 3500, annualSavingsPct: 27,
    exampleEggPrice: 'EGP 120 per tray',
    exampleRevenue: 'EGP 96,000', exampleCostPerEgg: 'EGP 4.20',
  },

  // ── South Asia ────────────────────────────────────────────────────────────────
  IN: {
    code: 'INR', symbol: '₹', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 500, annualGrowth: 4000, annualSavingsPct: 33,
    exampleEggPrice: '₹ 200 per tray',
    exampleRevenue: '₹ 1,60,000', exampleCostPerEgg: '₹ 5.50',
  },
  PK: {
    code: 'PKR', symbol: 'Rs', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 2500, annualGrowth: 20000, annualSavingsPct: 33,
    exampleEggPrice: 'Rs 800 per tray',
    exampleRevenue: 'Rs 640,000', exampleCostPerEgg: 'Rs 28',
  },
  BD: {
    code: 'BDT', symbol: '৳', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 1000, annualGrowth: 8000, annualSavingsPct: 33,
    exampleEggPrice: '৳ 350 per tray',
    exampleRevenue: '৳ 2,80,000', exampleCostPerEgg: '৳ 12',
  },

  // ── Southeast Asia ────────────────────────────────────────────────────────────
  PH: {
    code: 'PHP', symbol: '₱', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 500, annualGrowth: 4000, annualSavingsPct: 33,
    exampleEggPrice: '₱ 250 per tray',
    exampleRevenue: '₱ 120,000', exampleCostPerEgg: '₱ 8',
  },
  ID: {
    code: 'IDR', symbol: 'Rp', symbolPosition: 'before',
    thousandsSeparator: '.', decimalSeparator: ',', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 100000, annualGrowth: 800000, annualSavingsPct: 33,
    exampleEggPrice: 'Rp 65.000 per tray',
    exampleRevenue: 'Rp 38.400.000', exampleCostPerEgg: 'Rp 2.200',
  },
  VN: {
    code: 'VND', symbol: '₫', symbolPosition: 'after',
    thousandsSeparator: '.', decimalSeparator: ',', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 200000, annualGrowth: 1600000, annualSavingsPct: 33,
    exampleEggPrice: '55.000₫ per tray',
    exampleRevenue: '39.600.000₫', exampleCostPerEgg: '1.900₫',
  },

  // ── Latin America ─────────────────────────────────────────────────────────────
  BR: {
    code: 'BRL', symbol: 'R$', symbolPosition: 'before',
    thousandsSeparator: '.', decimalSeparator: ',', decimals: 2,
    monthlyFree: 0, monthlyGrowth: 45, annualGrowth: 400, annualSavingsPct: 26,
    exampleEggPrice: 'R$ 18 por bandeja',
    exampleRevenue: 'R$ 14.400', exampleCostPerEgg: 'R$ 0,58',
  },
  MX: {
    code: 'MXN', symbol: 'MX$', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 150, annualGrowth: 1200, annualSavingsPct: 33,
    exampleEggPrice: 'MX$ 85 por charola',
    exampleRevenue: 'MX$ 48,000', exampleCostPerEgg: 'MX$ 2.80',
  },
  CO: {
    code: 'COP', symbol: 'COP$', symbolPosition: 'before',
    thousandsSeparator: '.', decimalSeparator: ',', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 35000, annualGrowth: 300000, annualSavingsPct: 29,
    exampleEggPrice: 'COP$ 15.000 por bandeja',
    exampleRevenue: 'COP$ 9.600.000', exampleCostPerEgg: 'COP$ 520',
  },

  // ── Fallback ──────────────────────────────────────────────────────────────────
  DEFAULT: {
    code: 'USD', symbol: '$', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    monthlyFree: 0, monthlyGrowth: 10, annualGrowth: 100, annualSavingsPct: 17,
    exampleEggPrice: '$6 per tray',
    exampleRevenue: '$2,480', exampleCostPerEgg: '$0.032',
  },
}

// ── Country selector options ───────────────────────────────────────────────────

export type CountryOption = {
  code: string
  name: string
  flag: string
  currencyCode: string
}

export const SUPPORTED_COUNTRIES: CountryOption[] = [
  // East Africa
  { code: 'KE', name: 'Kenya',        flag: '🇰🇪', currencyCode: 'KES' },
  { code: 'TZ', name: 'Tanzania',     flag: '🇹🇿', currencyCode: 'TZS' },
  { code: 'UG', name: 'Uganda',       flag: '🇺🇬', currencyCode: 'UGX' },
  { code: 'RW', name: 'Rwanda',       flag: '🇷🇼', currencyCode: 'RWF' },
  { code: 'ET', name: 'Ethiopia',     flag: '🇪🇹', currencyCode: 'ETB' },
  // West Africa
  { code: 'NG', name: 'Nigeria',      flag: '🇳🇬', currencyCode: 'NGN' },
  { code: 'GH', name: 'Ghana',        flag: '🇬🇭', currencyCode: 'GHS' },
  { code: 'SN', name: 'Senegal',      flag: '🇸🇳', currencyCode: 'XOF' },
  { code: 'CI', name: 'Ivory Coast',  flag: '🇨🇮', currencyCode: 'XOF' },
  { code: 'CM', name: 'Cameroon',     flag: '🇨🇲', currencyCode: 'XAF' },
  // Southern Africa
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currencyCode: 'ZAR' },
  { code: 'ZM', name: 'Zambia',       flag: '🇿🇲', currencyCode: 'ZMW' },
  { code: 'MW', name: 'Malawi',       flag: '🇲🇼', currencyCode: 'MWK' },
  // North Africa
  { code: 'EG', name: 'Egypt',        flag: '🇪🇬', currencyCode: 'EGP' },
  // South Asia
  { code: 'IN', name: 'India',        flag: '🇮🇳', currencyCode: 'INR' },
  { code: 'PK', name: 'Pakistan',     flag: '🇵🇰', currencyCode: 'PKR' },
  { code: 'BD', name: 'Bangladesh',   flag: '🇧🇩', currencyCode: 'BDT' },
  // Southeast Asia
  { code: 'PH', name: 'Philippines',  flag: '🇵🇭', currencyCode: 'PHP' },
  { code: 'ID', name: 'Indonesia',    flag: '🇮🇩', currencyCode: 'IDR' },
  { code: 'VN', name: 'Vietnam',      flag: '🇻🇳', currencyCode: 'VND' },
  // Latin America
  { code: 'BR', name: 'Brazil',       flag: '🇧🇷', currencyCode: 'BRL' },
  { code: 'MX', name: 'Mexico',       flag: '🇲🇽', currencyCode: 'MXN' },
  { code: 'CO', name: 'Colombia',     flag: '🇨🇴', currencyCode: 'COP' },
  // Fallback
  { code: 'DEFAULT', name: 'Other (USD)', flag: '🌍', currencyCode: 'USD' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getCurrencyConfig(countryCode: string): CurrencyConfig {
  return CURRENCY_MAP[countryCode] ?? CURRENCY_MAP.DEFAULT
}

export function formatPrice(amount: number, config: CurrencyConfig): string {
  const parts = amount.toFixed(config.decimals).split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandsSeparator)
  const formatted =
    config.decimals > 0 && parts[1] ? intPart + config.decimalSeparator + parts[1] : intPart

  if (config.symbolPosition === 'after') return `${formatted} ${config.symbol}`
  const needsSpace = config.symbol.length > 1
  return needsSpace ? `${config.symbol} ${formatted}` : `${config.symbol}${formatted}`
}
