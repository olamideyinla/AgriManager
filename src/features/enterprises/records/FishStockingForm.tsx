import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { nanoid } from 'nanoid'
import { useAuthStore } from '../../../stores/auth-store'
import { useUIStore } from '../../../stores/ui-store'
import { db } from '../../../core/database/db'
import { NumberInput } from '../../../shared/components/entry/NumberInput'
import { SaveButton } from '../../../shared/components/entry/SaveButton'
import type { FishStockingRecord } from '../../../shared/types'

interface FormValues {
  stockingDate: string
  species: string
  count: string
  avgWeightG: string
  source: string
  supplier: string
  pricePerKgCents: string
  notes: string
}

export default function FishStockingForm() {
  const { id: enterpriseId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = useAuthStore(s => s.user?.id) ?? ''
  const orgId  = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const addToast = useUIStore(s => s.addToast)
  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      stockingDate: today,
      species: '',
      count: '',
      avgWeightG: '',
      source: '',
      supplier: '',
      pricePerKgCents: '',
      notes: '',
    },
  })

  const count   = parseInt(watch('count')) || 0
  const avgWtG  = parseFloat(watch('avgWeightG')) || 0
  const pricePk = Math.round((parseFloat(watch('pricePerKgCents')) || 0) * 100)
  const totalKg = (count * avgWtG) / 1000
  const totalCents = Math.round(totalKg * pricePk)

  const onSubmit = async (values: FormValues) => {
    if (!enterpriseId) return
    setIsSaving(true)
    try {
      const now  = new Date().toISOString()
      const cnt  = parseInt(values.count) || 0
      const wtG  = parseFloat(values.avgWeightG) || undefined
      const ppkg = Math.round((parseFloat(values.pricePerKgCents) || 0) * 100)
      const tkgs = wtG ? (cnt * wtG) / 1000 : 0
      const record: FishStockingRecord = {
        id:                   nanoid(),
        enterpriseInstanceId: enterpriseId,
        organizationId:       orgId,
        stockingDate:         values.stockingDate,
        species:              values.species || undefined,
        count:                cnt,
        avgWeightG:           wtG,
        source:               values.source || undefined,
        supplier:             values.supplier || undefined,
        pricePerKgCents:      ppkg,
        totalCostCents:       Math.round(tkgs * ppkg),
        notes:                values.notes || undefined,
        syncStatus:           'pending',
        createdAt:            now,
        updatedAt:            now,
      }
      await db.fishStockingRecords.put(record)
      setIsSuccess(true)
      addToast({ message: 'Stocking record saved', type: 'success' })
      setTimeout(() => navigate(-1), 900)
    } catch {
      addToast({ message: 'Failed to save — try again', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

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
          <p className="text-white font-semibold text-lg leading-tight">Fish Stocking Record</p>
          <p className="text-white/60 text-xs">Pond stocking event</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pb-8">

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Stocking Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stocking date</label>
              <input type="date" {...register('stockingDate')} className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
              <input {...register('species')} placeholder="e.g. Tilapia, Catfish, Salmon" className="input-base" />
            </div>
            <NumberInput
              label="Count (fingerlings)"
              value={watch('count')}
              onChange={(v) => setValue('count', v)}
              min="1"
            />
            <NumberInput
              label="Avg weight"
              unit="g"
              isDecimal
              value={watch('avgWeightG')}
              onChange={(v) => setValue('avgWeightG', v)}
              min="0"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Source & Cost</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <input {...register('source')} placeholder="Hatchery or farm" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <input {...register('supplier')} placeholder="Supplier name" className="input-base" />
            </div>
            <NumberInput
              label="Price per kg"
              isDecimal
              value={watch('pricePerKgCents')}
              onChange={(v) => setValue('pricePerKgCents', v)}
              min="0"
            />
            {totalCents > 0 && (
              <p className="text-xs text-gray-500">
                Est. total: <span className="font-semibold text-gray-700">
                  {(totalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                {' '}({totalKg.toFixed(2)} kg)
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Any additional notes…"
              className="input-base resize-none"
            />
          </div>

          <SaveButton isLoading={isSaving} isSuccess={isSuccess} />
        </form>
      </div>
    </div>
  )
}
