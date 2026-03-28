export type Region =
  | 'east_africa'
  | 'west_africa'
  | 'southern_africa'
  | 'south_asia'
  | 'southeast_asia'
  | 'latin_america'
  | 'other'

export type Testimonial = {
  quote: string
  name: string
  role: string
  countryCode: string
  flag: string
  region: Region
}

export const ALL_TESTIMONIALS: Testimonial[] = [
  // ── East Africa ──────────────────────────────────────────────────────────────
  {
    quote:
      'For the first time, I actually know my cost per egg. I discovered my second flock was losing money and adjusted my feed supplier.',
    name: 'James M.',
    role: 'Layer farmer, 10,000 birds — Kiambu, Kenya',
    countryCode: 'KE',
    flag: '🇰🇪',
    region: 'east_africa',
  },
  {
    quote:
      'I used to guess how my batches were doing. Now I see the FCR and growth curve update every day. My last batch hit an EPEF of 340.',
    name: 'Grace N.',
    role: 'Broiler farmer — Arusha, Tanzania',
    countryCode: 'TZ',
    flag: '🇹🇿',
    region: 'east_africa',
  },
  {
    quote:
      'When I went to the bank for a loan, I showed them my batch reports. The loan officer said it was the most organized application he had seen.',
    name: 'David O.',
    role: 'Broiler farmer — Kampala, Uganda',
    countryCode: 'UG',
    flag: '🇺🇬',
    region: 'east_africa',
  },

  // ── West Africa ───────────────────────────────────────────────────────────────
  {
    quote:
      'My workers enter data every morning on their phones. I review everything from home. I don\'t need to be at the farm every day.',
    name: 'Fatima A.',
    role: 'Mixed farm — Oyo, Nigeria',
    countryCode: 'NG',
    flag: '🇳🇬',
    region: 'west_africa',
  },
  {
    quote:
      'Feed costs were eating my profits without me knowing. AgriManagerX showed me exactly where the money was going. I switched suppliers and saved 15%.',
    name: 'Kwame D.',
    role: 'Layer farmer — Kumasi, Ghana',
    countryCode: 'GH',
    flag: '🇬🇭',
    region: 'west_africa',
  },
  {
    quote:
      'I manage three fish ponds and two poultry houses. Before this app, tracking everything was impossible. Now I see all enterprises side by side.',
    name: 'Amina S.',
    role: 'Mixed farm — Dakar, Senegal',
    countryCode: 'SN',
    flag: '🇸🇳',
    region: 'west_africa',
  },

  // ── South Asia ────────────────────────────────────────────────────────────────
  {
    quote:
      'The vaccination scheduler alone saved me from losing a whole flock. I got a reminder the day before Newcastle booster was due — I had completely forgotten.',
    name: 'Rajesh P.',
    role: 'Poultry farmer — Tamil Nadu, India',
    countryCode: 'IN',
    flag: '🇮🇳',
    region: 'south_asia',
  },
  {
    quote:
      'I track 50 dairy cows individually. The breeding calendar tells me exactly when to check for pregnancy and when to expect calving. No more missed heat cycles.',
    name: 'Anwar H.',
    role: 'Dairy farmer — Chittagong, Bangladesh',
    countryCode: 'BD',
    flag: '🇧🇩',
    region: 'south_asia',
  },

  // ── Southeast Asia ────────────────────────────────────────────────────────────
  {
    quote:
      'My tilapia farm runs on this app now. The water quality alerts caught a low oxygen event at 2 AM — I would have lost everything if I wasn\'t warned.',
    name: 'Maria L.',
    role: 'Fish farmer — Pampanga, Philippines',
    countryCode: 'PH',
    flag: '🇵🇭',
    region: 'southeast_asia',
  },

  // ── Southern Africa ───────────────────────────────────────────────────────────
  {
    quote:
      'I compared my last 6 broiler batches and found that my winter batches consistently underperform. Now I adjust my stocking density seasonally.',
    name: 'Thabo M.',
    role: 'Broiler farmer — Limpopo, South Africa',
    countryCode: 'ZA',
    flag: '🇿🇦',
    region: 'southern_africa',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const REGION_MAP: Record<string, Region> = {
  KE: 'east_africa', TZ: 'east_africa', UG: 'east_africa', RW: 'east_africa', ET: 'east_africa',
  NG: 'west_africa', GH: 'west_africa', SN: 'west_africa', CI: 'west_africa', CM: 'west_africa',
  ZA: 'southern_africa', ZM: 'southern_africa', MW: 'southern_africa',
  IN: 'south_asia', PK: 'south_asia', BD: 'south_asia',
  PH: 'southeast_asia', ID: 'southeast_asia', VN: 'southeast_asia',
  BR: 'latin_america', MX: 'latin_america', CO: 'latin_america',
  EG: 'other',
}

export function getRegionForCountry(code: string): Region {
  return REGION_MAP[code] ?? 'other'
}

/** Returns 3 testimonials: same-country first, then same-region, then others. */
export function getLocalizedTestimonials(countryCode: string): Testimonial[] {
  const visitorRegion = getRegionForCountry(countryCode)
  const scored = ALL_TESTIMONIALS.map(t => ({
    ...t,
    _score: t.countryCode === countryCode ? 3 : t.region === visitorRegion ? 2 : 1,
  }))
  scored.sort((a, b) => b._score - a._score)
  return scored.slice(0, 3)
}
