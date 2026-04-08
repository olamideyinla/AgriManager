import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../core/database/db'
import type { EnterpriseInstance, RabbitDailyRecord } from '../../../shared/types'

export interface RabbitMetrics {
  daysInBatch: number
  totalMortality: number
  mortalityRate: number    // %
  totalBirths: number
  totalWeans: number
  totalMatings: number
  totalFeedKg: number
  avgFeedPerDayKg: number
  latestAvgWeightKg: number | null
  // Chart data
  dailyFeed: Array<{ date: string; value: number }>
  weightData: Array<{ date: string; value: number }>
  // Raw records
  records: RabbitDailyRecord[]
}

export function useRabbitMetrics(
  enterprise: EnterpriseInstance | undefined,
): RabbitMetrics | undefined {
  return useLiveQuery(async () => {
    if (!enterprise) return undefined

    const records = await db.rabbitDailyRecords
      .where('enterpriseInstanceId')
      .equals(enterprise.id)
      .sortBy('date') as RabbitDailyRecord[]

    const daysInBatch = daysSince(enterprise.startDate)

    const empty: RabbitMetrics = {
      daysInBatch, totalMortality: 0, mortalityRate: 0,
      totalBirths: 0, totalWeans: 0, totalMatings: 0,
      totalFeedKg: 0, avgFeedPerDayKg: 0, latestAvgWeightKg: null,
      dailyFeed: [], weightData: [], records: [],
    }

    if (records.length === 0) return empty

    const totalMortality = records.reduce((s, r) => s + r.mortalityCount, 0)
    const totalBirths    = records.reduce((s, r) => s + (r.birthCount ?? 0), 0)
    const totalWeans     = records.reduce((s, r) => s + (r.weanCount ?? 0), 0)
    const totalMatings   = records.reduce((s, r) => s + (r.matingCount ?? 0), 0)
    const totalFeedKg    = records.reduce((s, r) => s + r.feedConsumedKg, 0)
    const mortalityRate  = Math.round((totalMortality / Math.max(enterprise.initialStockCount, 1)) * 1000) / 10
    const avgFeedPerDayKg = daysInBatch > 0 ? Math.round((totalFeedKg / daysInBatch) * 10) / 10 : 0

    const withWeight = [...records].reverse().find(r => r.avgBodyWeightSampleKg != null)
    const latestAvgWeightKg = withWeight?.avgBodyWeightSampleKg ?? null

    const dailyFeed = records.slice(-30).map(r => ({ date: r.date.slice(5), value: r.feedConsumedKg }))
    const weightData = records
      .filter(r => r.avgBodyWeightSampleKg != null)
      .map(r => ({ date: r.date.slice(5), value: r.avgBodyWeightSampleKg! }))

    return {
      daysInBatch, totalMortality, mortalityRate,
      totalBirths, totalWeans, totalMatings,
      totalFeedKg: Math.round(totalFeedKg * 10) / 10,
      avgFeedPerDayKg, latestAvgWeightKg,
      dailyFeed, weightData, records,
    }
  }, [enterprise?.id, enterprise?.startDate, enterprise?.currentStockCount, enterprise?.initialStockCount])
}

function daysSince(dateStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000))
}
