export type CurrencyConfig = {
  code: string
  symbol: string
  symbolPosition: 'before' | 'after'
  thousandsSeparator: string
  decimalSeparator: string
  decimals: number
  pro: { monthly: number; annual: number }
  x: { annual: number }
  exampleRevenue: string
  exampleCostPerEgg: string
}

export const CURRENCY_MAP: Record<string, CurrencyConfig> = {
  // ── East Africa ──────────────────────────────────────────────────────────────
  KE: {
    code: 'KES', symbol: 'KSh', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 800, annual: 6400 },
    x: { annual: 120000 },
    exampleRevenue: 'KSh 312,000',
    exampleCostPerEgg: 'KSh 12.50',
  },
  TZ: {
    code: 'TZS', symbol: 'TSh', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 15000, annual: 120000 },
    x: { annual: 2250000 },
    exampleRevenue: 'TSh 7,200,000',
    exampleCostPerEgg: 'TSh 290',
  },
  UG: {
    code: 'UGX', symbol: 'USh', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 25000, annual: 200000 },
    x: { annual: 3750000 },
    exampleRevenue: 'USh 9,600,000',
    exampleCostPerEgg: 'USh 420',
  },
  RW: {
    code: 'RWF', symbol: 'FRw', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 8000, annual: 64000 },
    x: { annual: 1200000 },
    exampleRevenue: 'FRw 3,600,000',
    exampleCostPerEgg: 'FRw 150',
  },
  ET: {
    code: 'ETB', symbol: 'Br', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 500, annual: 4000 },
    x: { annual: 75000 },
    exampleRevenue: 'Br 160,000',
    exampleCostPerEgg: 'Br 7',
  },

  // ── West Africa ───────────────────────────────────────────────────────────────
  NG: {
    code: 'NGN', symbol: '₦', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 10000, annual: 100000 },
    x: { annual: 750000 },
    exampleRevenue: '₦2,400,000',
    exampleCostPerEgg: '₦85',
  },
  GH: {
    code: 'GHS', symbol: 'GH₵', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 80, annual: 640 },
    x: { annual: 12000 },
    exampleRevenue: 'GH₵ 36,000',
    exampleCostPerEgg: 'GH₵ 1.50',
  },
  SN: {
    code: 'XOF', symbol: 'FCFA', symbolPosition: 'after',
    thousandsSeparator: '.', decimalSeparator: ',', decimals: 0,
    pro: { monthly: 4000, annual: 32000 },
    x: { annual: 600000 },
    exampleRevenue: '1,920,000 FCFA',
    exampleCostPerEgg: '85 FCFA',
  },
  CI: {
    code: 'XOF', symbol: 'FCFA', symbolPosition: 'after',
    thousandsSeparator: '.', decimalSeparator: ',', decimals: 0,
    pro: { monthly: 4000, annual: 32000 },
    x: { annual: 600000 },
    exampleRevenue: '1,920,000 FCFA',
    exampleCostPerEgg: '85 FCFA',
  },
  CM: {
    code: 'XAF', symbol: 'FCFA', symbolPosition: 'after',
    thousandsSeparator: '.', decimalSeparator: ',', decimals: 0,
    pro: { monthly: 4000, annual: 32000 },
    x: { annual: 600000 },
    exampleRevenue: '1,920,000 FCFA',
    exampleCostPerEgg: '85 FCFA',
  },

  // ── Southern Africa ───────────────────────────────────────────────────────────
  ZA: {
    code: 'ZAR', symbol: 'R', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 120, annual: 960 },
    x: { annual: 18000 },
    exampleRevenue: 'R 44,000',
    exampleCostPerEgg: 'R 1.80',
  },
  ZM: {
    code: 'ZMW', symbol: 'ZK', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 200, annual: 1600 },
    x: { annual: 30000 },
    exampleRevenue: 'ZK 96,000',
    exampleCostPerEgg: 'ZK 4.20',
  },
  MW: {
    code: 'MWK', symbol: 'MK', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 12000, annual: 96000 },
    x: { annual: 1800000 },
    exampleRevenue: 'MK 4,800,000',
    exampleCostPerEgg: 'MK 200',
  },

  // ── Middle East / North Africa ────────────────────────────────────────────────
  EG: {
    code: 'EGP', symbol: 'EGP', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 300, annual: 2400 },
    x: { annual: 45000 },
    exampleRevenue: 'EGP 96,000',
    exampleCostPerEgg: 'EGP 4.20',
  },

  // ── South Asia ────────────────────────────────────────────────────────────────
  IN: {
    code: 'INR', symbol: '₹', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 599, annual: 4799 },
    x: { annual: 90000 },
    exampleRevenue: '₹ 1,60,000',
    exampleCostPerEgg: '₹ 5.50',
  },
  PK: {
    code: 'PKR', symbol: 'Rs', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 2000, annual: 16000 },
    x: { annual: 300000 },
    exampleRevenue: 'Rs 640,000',
    exampleCostPerEgg: 'Rs 28',
  },
  BD: {
    code: 'BDT', symbol: '৳', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 800, annual: 6400 },
    x: { annual: 120000 },
    exampleRevenue: '৳ 2,80,000',
    exampleCostPerEgg: '৳ 12',
  },

  // ── Southeast Asia ────────────────────────────────────────────────────────────
  PH: {
    code: 'PHP', symbol: '₱', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 399, annual: 3199 },
    x: { annual: 60000 },
    exampleRevenue: '₱ 120,000',
    exampleCostPerEgg: '₱ 8',
  },
  ID: {
    code: 'IDR', symbol: 'Rp', symbolPosition: 'before',
    thousandsSeparator: '.', decimalSeparator: ',', decimals: 0,
    pro: { monthly: 99000, annual: 790000 },
    x: { annual: 14850000 },
    exampleRevenue: 'Rp 38.400.000',
    exampleCostPerEgg: 'Rp 2.200',
  },
  VN: {
    code: 'VND', symbol: '₫', symbolPosition: 'after',
    thousandsSeparator: '.', decimalSeparator: ',', decimals: 0,
    pro: { monthly: 159000, annual: 1270000 },
    x: { annual: 23850000 },
    exampleRevenue: '39.600.000₫',
    exampleCostPerEgg: '1.900₫',
  },

  // ── Latin America ─────────────────────────────────────────────────────────────
  BR: {
    code: 'BRL', symbol: 'R$', symbolPosition: 'before',
    thousandsSeparator: '.', decimalSeparator: ',', decimals: 2,
    pro: { monthly: 39.9, annual: 319 },
    x: { annual: 5985 },
    exampleRevenue: 'R$ 14.400',
    exampleCostPerEgg: 'R$ 0,58',
  },
  MX: {
    code: 'MXN', symbol: 'MX$', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 129, annual: 1029 },
    x: { annual: 19350 },
    exampleRevenue: 'MX$ 48,000',
    exampleCostPerEgg: 'MX$ 2.80',
  },
  CO: {
    code: 'COP', symbol: 'COP$', symbolPosition: 'before',
    thousandsSeparator: '.', decimalSeparator: ',', decimals: 0,
    pro: { monthly: 29900, annual: 239000 },
    x: { annual: 4485000 },
    exampleRevenue: 'COP$ 9.600.000',
    exampleCostPerEgg: 'COP$ 520',
  },

  // ── Fallback ──────────────────────────────────────────────────────────────────
  DEFAULT: {
    code: 'USD', symbol: '$', symbolPosition: 'before',
    thousandsSeparator: ',', decimalSeparator: '.', decimals: 0,
    pro: { monthly: 10, annual: 100 },
    x: { annual: 1500 },
    exampleRevenue: '$2,480',
    exampleCostPerEgg: '$0.032',
  },
}

/** Reverse map: currency code → country code for CURRENCY_MAP lookup.
 *  Populated from CURRENCY_MAP automatically to stay in sync. */
export const CURRENCY_CODE_TO_COUNTRY: Record<string, string> = Object.fromEntries(
  Object.entries(CURRENCY_MAP)
    .filter(([k]) => k !== 'DEFAULT')
    .map(([country, cfg]) => [cfg.code, country])
)

export function getCurrencyConfig(countryCode: string): CurrencyConfig {
  return CURRENCY_MAP[countryCode] ?? CURRENCY_MAP['DEFAULT']!
}

/** Looks up CurrencyConfig by currency code (e.g. 'KES', 'NGN').
 *  Falls back to DEFAULT (USD) for unknown codes. */
export function getCurrencyConfigByCode(currencyCode: string): CurrencyConfig {
  const country = CURRENCY_CODE_TO_COUNTRY[currencyCode]
  return country ? CURRENCY_MAP[country]! : CURRENCY_MAP['DEFAULT']!
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
