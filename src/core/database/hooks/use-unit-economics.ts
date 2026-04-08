import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { EnterpriseInstance } from '../../../shared/types'

export interface UnitEconomics {
  totalExpenses: number         // sum of all expense transactions (dollars)
  totalIncome: number
  netProfit: number
  feedCostTotal: number         // sum of 'feed' category expenses
  feedCostPct: number           // feedCost / totalExpenses * 100
  laborCostPct: number          // labor / totalExpenses * 100
  // Per-unit (undefined if not applicable or no data)
  costPerEgg?: number           // layers: totalExpenses / totalEggs
  costPerTray?: number          // layers: costPerEgg * 30
  breakEvenEggPrice?: number    // layers: totalExpenses / totalEggs
  costPerBird?: number          // poultry: totalExpenses / initialStockCount
  costPerKgMeat?: number        // broilers: totalExpenses / (currentStock * avgWeight)
  costPerLiterMilk?: number     // cattle_dairy: totalExpenses / totalMilkLiters
  costPerKgFish?: number        // fish: totalExpenses / estimatedBiomassKg
  costPerKgHarvest?: number     // crops: totalExpenses / totalHarvestKg
  feedKgPerOutputUnit?: number  // feed FCR-style per output unit
}

const DEFAULT: UnitEconomics = {
  totalExpenses: 0,
  totalIncome: 0,
  netProfit: 0,
  feedCostTotal: 0,
  feedCostPct: 0,
  laborCostPct: 0,
}

export function useUnitEconomics(
  enterpriseId: string | undefined,
  enterprise: EnterpriseInstance | null | undefined,
): UnitEconomics {
  const transactions = useLiveQuery(
    async () => {
      if (!enterpriseId) return []
      return db.financialTransactions
        .where('enterpriseInstanceId').equals(enterpriseId).toArray()
    },
    [enterpriseId],
  )

  // Per-type production totals
  const layerRecords = useLiveQuery(
    async () => {
      if (!enterpriseId || enterprise?.enterpriseType !== 'layers') return null
      return db.layerDailyRecords
        .where('enterpriseInstanceId').equals(enterpriseId).toArray()
    },
    [enterpriseId, enterprise?.enterpriseType],
  )

  const broilerRecords = useLiveQuery(
    async () => {
      if (!enterpriseId || enterprise?.enterpriseType !== 'broilers') return null
      return db.broilerDailyRecords
        .where('enterpriseInstanceId').equals(enterpriseId).toArray()
    },
    [enterpriseId, enterprise?.enterpriseType],
  )

  const cattleRecords = useLiveQuery(
    async () => {
      if (!enterpriseId || (enterprise?.enterpriseType !== 'cattle_dairy' && enterprise?.enterpriseType !== 'cattle_beef')) return null
      return db.cattleDailyRecords
        .where('enterpriseInstanceId').equals(enterpriseId).toArray()
    },
    [enterpriseId, enterprise?.enterpriseType],
  )

  const fishRecords = useLiveQuery(
    async () => {
      if (!enterpriseId || enterprise?.enterpriseType !== 'fish') return null
      return db.fishDailyRecords
        .where('enterpriseInstanceId').equals(enterpriseId).toArray()
    },
    [enterpriseId, enterprise?.enterpriseType],
  )

  const cropRecords = useLiveQuery(
    async () => {
      if (!enterpriseId || (enterprise?.enterpriseType !== 'crop_annual' && enterprise?.enterpriseType !== 'crop_perennial')) return null
      return db.cropActivityRecords
        .where('enterpriseInstanceId').equals(enterpriseId).toArray()
    },
    [enterpriseId, enterprise?.enterpriseType],
  )

  return useMemo<UnitEconomics>(() => {
    if (!transactions || !enterprise) return DEFAULT

    const expenses   = transactions.filter(t => t.type === 'expense')
    const income     = transactions.filter(t => t.type === 'income')
    const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0)
    const totalIncome   = income.reduce((s, t) => s + t.amount, 0)
    const feedCostTotal = expenses
      .filter(t => t.category === 'feed')
      .reduce((s, t) => s + t.amount, 0)
    const laborCostTotal = expenses
      .filter(t => t.category === 'labor')
      .reduce((s, t) => s + t.amount, 0)
    const feedCostPct  = totalExpenses > 0 ? (feedCostTotal / totalExpenses) * 100 : 0
    const laborCostPct = totalExpenses > 0 ? (laborCostTotal / totalExpenses) * 100 : 0

    const base: UnitEconomics = {
      totalExpenses,
      totalIncome,
      netProfit: totalIncome - totalExpenses,
      feedCostTotal,
      feedCostPct,
      laborCostPct,
    }

    if (totalExpenses <= 0) return base

    const t = enterprise.enterpriseType

    if (t === 'layers' && layerRecords) {
      const totalEggs = layerRecords.reduce((s, r) => s + (r.totalEggs ?? 0) - (r.brokenEggs ?? 0) - (r.rejectEggs ?? 0), 0)
      const totalFeedKg = layerRecords.reduce((s, r) => s + (r.feedConsumedKg ?? 0), 0)
      const costPerEgg = totalEggs > 0 ? totalExpenses / totalEggs : undefined
      return {
        ...base,
        costPerEgg,
        costPerTray: costPerEgg != null ? costPerEgg * 30 : undefined,
        breakEvenEggPrice: costPerEgg,
        costPerBird: totalExpenses / Math.max(enterprise.initialStockCount, 1),
        feedKgPerOutputUnit: totalEggs > 0 && totalFeedKg > 0 ? totalFeedKg / totalEggs : undefined,
      }
    }

    if (t === 'broilers' && broilerRecords) {
      const totalFeedKg = broilerRecords.reduce((s, r) => s + (r.feedConsumedKg ?? 0), 0)
      const withWeight  = broilerRecords.filter(r => r.bodyWeightSampleAvg != null && r.bodyWeightSampleAvg! > 0)
      const latestWeight = withWeight.length > 0
        ? withWeight.sort((a, b) => b.date.localeCompare(a.date))[0].bodyWeightSampleAvg!
        : null
      const currentStock = enterprise.currentStockCount
      const biomassKg = latestWeight != null && currentStock > 0 ? currentStock * latestWeight : null
      return {
        ...base,
        costPerBird: totalExpenses / Math.max(enterprise.initialStockCount, 1),
        costPerKgMeat: biomassKg != null && biomassKg > 0 ? totalExpenses / biomassKg : undefined,
        feedKgPerOutputUnit: biomassKg != null && biomassKg > 0 && totalFeedKg > 0 ? totalFeedKg / biomassKg : undefined,
      }
    }

    if (t === 'cattle_dairy' && cattleRecords) {
      const totalMilk = cattleRecords.reduce((s, r) => s + (r.milkYieldLiters ?? 0), 0)
      return {
        ...base,
        costPerBird: totalExpenses / Math.max(enterprise.initialStockCount, 1),
        costPerLiterMilk: totalMilk > 0 ? totalExpenses / totalMilk : undefined,
        feedKgPerOutputUnit: totalMilk > 0
          ? cattleRecords.reduce((s, r) => s + (r.feedConsumedKg ?? 0), 0) / totalMilk
          : undefined,
      }
    }

    if ((t === 'cattle_beef') && cattleRecords) {
      return {
        ...base,
        costPerBird: totalExpenses / Math.max(enterprise.initialStockCount, 1),
      }
    }

    if (t === 'fish' && fishRecords) {
      const totalFeedKg = fishRecords.reduce((s, r) => s + (r.feedGivenKg ?? 0), 0)
      // Estimate biomass using same proxy as fish metrics: totalFeed * 0.25
      const estimatedBiomassKg = enterprise.currentStockCount > 0 && totalFeedKg > 0
        ? Math.round(totalFeedKg * 0.25 * 10) / 10
        : null
      return {
        ...base,
        costPerKgFish: estimatedBiomassKg != null && estimatedBiomassKg > 0
          ? totalExpenses / estimatedBiomassKg : undefined,
        feedKgPerOutputUnit: estimatedBiomassKg != null && estimatedBiomassKg > 0 && totalFeedKg > 0
          ? totalFeedKg / estimatedBiomassKg : undefined,
      }
    }

    if ((t === 'crop_annual' || t === 'crop_perennial') && cropRecords) {
      const totalHarvestKg = cropRecords.reduce((s, r) => s + (r.harvestQuantityKg ?? 0), 0)
      const totalLaborHours = cropRecords.reduce((s, r) => s + (r.laborHours ?? 0), 0)
      const totalHours = totalLaborHours
      return {
        ...base,
        costPerKgHarvest: totalHarvestKg > 0 ? totalExpenses / totalHarvestKg : undefined,
        feedKgPerOutputUnit: totalHours > 0 && totalHarvestKg > 0 ? totalHours / totalHarvestKg : undefined,
      }
    }

    // Generic
    return {
      ...base,
      costPerBird: totalExpenses / Math.max(enterprise.initialStockCount, 1),
    }
  }, [transactions, enterprise, layerRecords, broilerRecords, cattleRecords, fishRecords, cropRecords])
}
