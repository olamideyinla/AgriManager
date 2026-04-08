import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { useAuthStore } from '../../../stores/auth-store'
import { useUIStore } from '../../../stores/ui-store'
import { db } from '../../../core/database/db'
import { NumberInput } from '../../../shared/components/entry/NumberInput'
import { SaveButton } from '../../../shared/components/entry/SaveButton'
import type { BatchCloseout } from '../../../shared/types'

interface FormValues {
  closeoutDate: string
  totalDays: string
  finalCount: string
  totalDeaths: string
  mortalityRate: string
  totalEggsProduced: string
  totalFeedConsumedKg: string
  avgFCR: string
  totalRevenueCents: string
  totalFeedCostCents: string
  netProfitCents: string
  notes: string
}

export default function BatchCloseoutForm() {
  const { id: enterpriseId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = useAuthStore(s => s.user?.id) ?? ''
  const orgId  = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const addToast = useUIStore(s => s.addToast)
  const [isSaving, setIsSaving]   = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [autoFilled, setAutoFilled] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, watch, setValue, reset } = useForm<FormValues>({
    defaultValues: {
      closeoutDate:       today,
      totalDays:          '',
      finalCount:         '',
      totalDeaths:        '',
      mortalityRate:      '',
      totalEggsProduced:  '',
      totalFeedConsumedKg:'',
      avgFCR:             '',
      totalRevenueCents:  '',
      totalFeedCostCents: '',
      netProfitCents:     '',
      notes:              '',
    },
  })

  // Load enterprise + daily records to auto-populate
  const enterprise = useLiveQuery(
    () => enterpriseId ? db.enterpriseInstances.get(enterpriseId) : undefined,
    [enterpriseId],
  )

  useEffect(() => {
    if (!enterprise || autoFilled) return
    const populate = async () => {
      const type = enterprise.enterpriseType
      let totalDeaths = 0
      let totalFeed   = 0
      let totalEggs   = 0
      let recordCount = 0

      if (type === 'layers') {
        const recs = await db.layerDailyRecords.where('enterpriseInstanceId').equals(enterprise.id).toArray()
        recordCount  = recs.length
        totalDeaths  = recs.reduce((s, r) => s + (r.mortalityCount ?? 0), 0)
        totalFeed    = recs.reduce((s, r) => s + (r.feedConsumedKg ?? 0), 0)
        totalEggs    = recs.reduce((s, r) => s + (r.totalEggs ?? 0), 0)
      } else if (type === 'broilers') {
        const recs = await db.broilerDailyRecords.where('enterpriseInstanceId').equals(enterprise.id).toArray()
        recordCount  = recs.length
        totalDeaths  = recs.reduce((s, r) => s + (r.mortalityCount ?? 0), 0)
        totalFeed    = recs.reduce((s, r) => s + (r.feedConsumedKg ?? 0), 0)
      } else if (type === 'fish') {
        const recs = await db.fishDailyRecords.where('enterpriseInstanceId').equals(enterprise.id).toArray()
        recordCount  = recs.length
        totalDeaths  = recs.reduce((s, r) => s + (r.estimatedMortality ?? 0), 0)
        totalFeed    = recs.reduce((s, r) => s + (r.feedGivenKg ?? 0), 0)
      } else if (type === 'pigs_breeding' || type === 'pigs_growfinish') {
        const recs = await db.pigDailyRecords.where('enterpriseInstanceId').equals(enterprise.id).toArray()
        recordCount  = recs.length
        totalDeaths  = recs.reduce((s, r) => s + (r.mortalityCount ?? 0), 0)
        totalFeed    = recs.reduce((s, r) => s + (r.feedConsumedKg ?? 0), 0)
      }

      const startMs  = new Date(enterprise.startDate).getTime()
      const endMs    = new Date(today).getTime()
      const days     = Math.max(1, Math.floor((endMs - startMs) / 86_400_000))
      const initial  = enterprise.initialStockCount || 1
      const mortRate = Math.round((totalDeaths / initial) * 1000) / 10
      const final    = Math.max(0, initial - totalDeaths)

      setValue('totalDays',          String(recordCount || days))
      setValue('finalCount',         String(final))
      setValue('totalDeaths',        String(totalDeaths))
      setValue('mortalityRate',      String(mortRate))
      setValue('totalFeedConsumedKg', String(Math.round(totalFeed * 100) / 100))
      if (totalEggs > 0) setValue('totalEggsProduced', String(totalEggs))
      setAutoFilled(true)
    }
    populate()
  }, [enterprise]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-compute net profit
  const revenue  = Math.round((parseFloat(watch('totalRevenueCents'))  || 0) * 100)
  const feedCost = Math.round((parseFloat(watch('totalFeedCostCents')) || 0) * 100)
  const net      = revenue - feedCost

  const onSubmit = async (values: FormValues) => {
    if (!enterpriseId) return
    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      const rev  = Math.round((parseFloat(values.totalRevenueCents)  || 0) * 100)
      const feed = Math.round((parseFloat(values.totalFeedCostCents) || 0) * 100)
      const record: BatchCloseout = {
        id:                   nanoid(),
        enterpriseInstanceId: enterpriseId,
        organizationId:       orgId,
        closeoutDate:         values.closeoutDate,
        totalDays:            parseInt(values.totalDays) || 0,
        finalCount:           parseInt(values.finalCount) || 0,
        totalDeaths:          parseInt(values.totalDeaths) || 0,
        mortalityRate:        parseFloat(values.mortalityRate) || 0,
        totalEggsProduced:    parseFloat(values.totalEggsProduced) || undefined,
        totalFeedConsumedKg:  parseFloat(values.totalFeedConsumedKg) || 0,
        avgFCR:               parseFloat(values.avgFCR) || undefined,
        totalRevenueCents:    rev,
        totalFeedCostCents:   feed,
        netProfitCents:       rev - feed,
        notes:                values.notes || undefined,
        syncStatus:           'pending',
        createdAt:            now,
        updatedAt:            now,
      }
      await db.batchCloseouts.put(record)
      setIsSuccess(true)
      addToast({ message: 'Batch close-out saved', type: 'success' })
      setTimeout(() => navigate(-1), 900)
    } catch {
      addToast({ message: 'Failed to save — try again', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const isLayer = enterprise?.enterpriseType === 'layers'

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      <div className="bg-primary-600 px-4 pt-3 pb-4 safe-top flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white active:scale-95"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <p className="text-white font-semibold text-lg leading-tight">Batch Close-Out</p>
          <p className="text-white/60 text-xs">Final batch summary &amp; financials</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pb-8">

          {autoFilled && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700">
              Fields auto-populated from your daily records. Review and adjust as needed.
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Batch Summary</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Close-out date</label>
              <input type="date" {...register('closeoutDate')} className="input-base" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Total days"
                value={watch('totalDays')}
                onChange={(v) => setValue('totalDays', v)}
                min="1"
              />
              <NumberInput
                label="Final count"
                value={watch('finalCount')}
                onChange={(v) => setValue('finalCount', v)}
                min="0"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Total deaths"
                value={watch('totalDeaths')}
                onChange={(v) => setValue('totalDeaths', v)}
                min="0"
              />
              <NumberInput
                label="Mortality %"
                isDecimal
                value={watch('mortalityRate')}
                onChange={(v) => setValue('mortalityRate', v)}
                min="0"
              />
            </div>
            {isLayer && (
              <NumberInput
                label="Total eggs produced"
                value={watch('totalEggsProduced')}
                onChange={(v) => setValue('totalEggsProduced', v)}
                min="0"
              />
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Feed Performance</h3>
            <NumberInput
              label="Total feed consumed"
              unit="kg"
              isDecimal
              value={watch('totalFeedConsumedKg')}
              onChange={(v) => setValue('totalFeedConsumedKg', v)}
              min="0"
            />
            <NumberInput
              label="Avg FCR"
              isDecimal
              value={watch('avgFCR')}
              onChange={(v) => setValue('avgFCR', v)}
              min="0"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Financials</h3>
            <NumberInput
              label="Total revenue"
              isDecimal
              value={watch('totalRevenueCents')}
              onChange={(v) => setValue('totalRevenueCents', v)}
              min="0"
            />
            <NumberInput
              label="Feed cost"
              isDecimal
              value={watch('totalFeedCostCents')}
              onChange={(v) => setValue('totalFeedCostCents', v)}
              min="0"
            />
            <div className={`rounded-xl p-3 text-sm font-semibold ${net >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              Net profit: {net >= 0 ? '+' : ''}{(net / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Any observations or lessons learned…"
              className="input-base resize-none"
            />
          </div>

          <SaveButton isLoading={isSaving} isSuccess={isSuccess} />
        </form>
      </div>
    </div>
  )
}
