import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../core/database/db'
import type { EnterpriseInstance, PigDailyRecord } from '../../../shared/types'

export interface PigMetrics {
  daysInBatch: number
  totalMortality: number
  mortalityRate: number    // %
  totalBirths: number
  totalWeans: number
  totalFeedKg: number
  avgFeedPerDayKg: number
  latestAvgWeightKg: number | null
  fcr: number | null       // totalFeedKg / (liveWeight)
  // Chart data
  dailyFeed: Array<{ date: string; value: number }>
  weightData: Array<{ date: string; value: number }>
  // Raw records
  records: PigDailyRecord[]
}

export function usePigMetrics(
  enterprise: EnterpriseInstance | undefined,
): PigMetrics | undefined {
  return useLiveQuery(async () => {
    if (!enterprise) return undefined

    const records = await db.pigDailyRecords
      .where('enterpriseInstanceId')
      .equals(enterprise.id)
      .sortBy('date') as PigDailyRecord[]

    const daysInBatch = daysSince(enterprise.startDate)

    const empty: PigMetrics = {
      daysInBatch, totalMortality: 0, mortalityRate: 0,
      totalBirths: 0, totalWeans: 0, totalFeedKg: 0,
      avgFeedPerDayKg: 0, latestAvgWeightKg: null, fcr: null,
      dailyFeed: [], weightData: [], records: [],
    }

    if (records.length === 0) return empty

    const totalMortality = records.reduce((s, r) => s + r.mortalityCount, 0)
    const totalBirths    = records.reduce((s, r) => s + (r.birthCount ?? 0), 0)
    const totalWeans     = records.reduce((s, r) => s + (r.weanCount ?? 0), 0)
    const totalFeedKg    = records.reduce((s, r) => s + r.feedConsumedKg, 0)
    const mortalityRate  = Math.round((totalMortality / Math.max(enterprise.initialStockCount, 1)) * 1000) / 10
    const avgFeedPerDayKg = daysInBatch > 0 ? Math.round((totalFeedKg / daysInBatch) * 10) / 10 : 0

    const withWeight = [...records].reverse().find(r => r.avgBodyWeightSampleKg != null)
    const latestAvgWeightKg = withWeight?.avgBodyWeightSampleKg ?? null

    const liveWeight = enterprise.currentStockCount > 0 && latestAvgWeightKg != null
      ? enterprise.currentStockCount * latestAvgWeightKg
      : null
    const fcr = liveWeight != null && liveWeight > 0 && totalFeedKg > 0
      ? Math.round((totalFeedKg / liveWeight) * 100) / 100
      : null

    const dailyFeed = records.slice(-30).map(r => ({ date: r.date.slice(5), value: r.feedConsumedKg }))
    const weightData = records
      .filter(r => r.avgBodyWeightSampleKg != null)
      .map(r => ({ date: r.date.slice(5), value: r.avgBodyWeightSampleKg! }))

    return {
      daysInBatch, totalMortality, mortalityRate,
      totalBirths, totalWeans,
      totalFeedKg: Math.round(totalFeedKg * 10) / 10,
      avgFeedPerDayKg, latestAvgWeightKg, fcr,
      dailyFeed, weightData, records,
    }
  }, [enterprise?.id, enterprise?.startDate, enterprise?.currentStockCount, enterprise?.initialStockCount])
}

function daysSince(dateStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000))
}
