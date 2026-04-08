import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { ReproductiveEvent, ReproductiveEventType } from '../../../shared/types'

export function useReproductiveEvents(
  enterpriseInstanceId: string | undefined,
): ReproductiveEvent[] | undefined {
  return useLiveQuery(
    async () => {
      if (!enterpriseInstanceId) return []
      return db.reproductiveEvents
        .where('enterpriseInstanceId')
        .equals(enterpriseInstanceId)
        .reverse()
        .sortBy('eventDate')
    },
    [enterpriseInstanceId],
  )
}

export function useReproductiveEventsByType(
  enterpriseInstanceId: string | undefined,
  eventType: ReproductiveEventType,
): ReproductiveEvent[] | undefined {
  return useLiveQuery(
    async () => {
      if (!enterpriseInstanceId) return []
      return db.reproductiveEvents
        .where('[enterpriseInstanceId+eventType]')
        .equals([enterpriseInstanceId, eventType])
        .reverse()
        .sortBy('eventDate')
    },
    [enterpriseInstanceId, eventType],
  )
}

export function useRecentBirths(
  enterpriseInstanceId: string | undefined,
  limitDays = 90,
): ReproductiveEvent[] | undefined {
  return useLiveQuery(
    async () => {
      if (!enterpriseInstanceId) return []
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - limitDays)
      const cutoffStr = cutoff.toISOString().slice(0, 10)
      const birthTypes: ReproductiveEventType[] = ['farrowing', 'calving', 'kindling']
      const all = await db.reproductiveEvents
        .where('enterpriseInstanceId')
        .equals(enterpriseInstanceId)
        .toArray()
      return all
        .filter(e => birthTypes.includes(e.eventType) && e.eventDate >= cutoffStr)
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
    },
    [enterpriseInstanceId, limitDays],
  )
}
