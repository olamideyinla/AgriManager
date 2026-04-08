import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { WithdrawalRecord } from '../../../shared/types'

export function useWithdrawalRecords(
  enterpriseInstanceId: string | undefined,
): WithdrawalRecord[] | undefined {
  return useLiveQuery(
    async () => {
      if (!enterpriseInstanceId) return []
      return db.withdrawalRecords
        .where('enterpriseInstanceId')
        .equals(enterpriseInstanceId)
        .reverse()
        .sortBy('treatmentDate')
    },
    [enterpriseInstanceId],
  )
}

/** Returns withdrawal records still in-period (withdrawalEndDate >= today). */
export function useActiveWithdrawals(
  enterpriseInstanceId: string | undefined,
): WithdrawalRecord[] | undefined {
  return useLiveQuery(
    async () => {
      if (!enterpriseInstanceId) return []
      const today = new Date().toISOString().slice(0, 10)
      const all = await db.withdrawalRecords
        .where('enterpriseInstanceId')
        .equals(enterpriseInstanceId)
        .toArray()
      return all
        .filter(r => r.withdrawalEndDate >= today)
        .sort((a, b) => a.withdrawalEndDate.localeCompare(b.withdrawalEndDate))
    },
    [enterpriseInstanceId],
  )
}

/** Returns all active withdrawals across all enterprises for an org. */
export function useOrgActiveWithdrawals(
  orgId: string | undefined,
): (WithdrawalRecord & { enterpriseName?: string })[] | undefined {
  return useLiveQuery(
    async () => {
      if (!orgId) return []
      const today = new Date().toISOString().slice(0, 10)
      const all = await db.withdrawalRecords.toArray()
      const active = all.filter(r => r.withdrawalEndDate >= today)

      const instanceIds = [...new Set(active.map(r => r.enterpriseInstanceId))]
      const instances = await db.enterpriseInstances
        .where('id')
        .anyOf(instanceIds)
        .toArray()
      const nameMap = new Map(instances.map(i => [i.id, i.name]))

      return active
        .map(r => ({ ...r, enterpriseName: nameMap.get(r.enterpriseInstanceId) }))
        .sort((a, b) => a.withdrawalEndDate.localeCompare(b.withdrawalEndDate))
    },
    [orgId],
  )
}
