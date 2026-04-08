import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { MarketPrice } from '../../../shared/types'

export function useMarketPrices(
  orgId: string | undefined,
): MarketPrice[] | undefined {
  return useLiveQuery(
    async () => {
      if (!orgId) return []
      return db.marketPrices
        .where('organizationId')
        .equals(orgId)
        .reverse()
        .sortBy('priceDate')
    },
    [orgId],
  )
}

/** Latest price per commodity for an org. */
export interface LatestCommodityPrice {
  commodity: string
  unit: string
  pricePerUnit: number
  priceDate: string
  source?: string
}

export function useLatestMarketPrices(
  orgId: string | undefined,
): LatestCommodityPrice[] | undefined {
  return useLiveQuery(
    async () => {
      if (!orgId) return []
      const all = await db.marketPrices
        .where('[organizationId+commodity]')
        .between([orgId, Dexie.minKey], [orgId, Dexie.maxKey])
        .toArray()

      // Group by commodity, keep latest by priceDate
      const map = new Map<string, MarketPrice>()
      for (const p of all) {
        const existing = map.get(p.commodity)
        if (!existing || p.priceDate > existing.priceDate) {
          map.set(p.commodity, p)
        }
      }

      return [...map.values()]
        .map(p => ({
          commodity: p.commodity,
          unit: p.unit,
          pricePerUnit: p.pricePerUnit,
          priceDate: p.priceDate,
          source: p.source,
        }))
        .sort((a, b) => a.commodity.localeCompare(b.commodity))
    },
    [orgId],
  )
}

export function useMarketPriceHistory(
  orgId: string | undefined,
  commodity: string | undefined,
): MarketPrice[] | undefined {
  return useLiveQuery(
    async () => {
      if (!orgId || !commodity) return []
      return db.marketPrices
        .where('[organizationId+commodity]')
        .equals([orgId, commodity])
        .reverse()
        .sortBy('priceDate')
    },
    [orgId, commodity],
  )
}
