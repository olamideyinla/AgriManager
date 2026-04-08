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
import type { PlacementRecord } from '../../../shared/types'

interface FormValues {
  placementDate: string
  count: string
  source: string
  supplier: string
  unitCostCents: string
  avgInitialWeightG: string
  breedOrStrain: string
  notes: string
}

export default function PlacementRecordForm() {
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
      placementDate: today,
      count: '',
      source: '',
      supplier: '',
      unitCostCents: '',
      avgInitialWeightG: '',
      breedOrStrain: '',
      notes: '',
    },
  })

  const count        = parseInt(watch('count')) || 0
  const unitCents    = Math.round((parseFloat(watch('unitCostCents')) || 0) * 100)
  const totalCents   = count * unitCents

  const onSubmit = async (values: FormValues) => {
    if (!enterpriseId) return
    setIsSaving(true)
    try {
      const now    = new Date().toISOString()
      const unit   = Math.round((parseFloat(values.unitCostCents) || 0) * 100)
      const cnt    = parseInt(values.count) || 0
      const record: PlacementRecord = {
        id:                   nanoid(),
        enterpriseInstanceId: enterpriseId,
        organizationId:       orgId,
        placementDate:        values.placementDate,
        count:                cnt,
        source:               values.source || undefined,
        supplier:             values.supplier || undefined,
        unitCostCents:        unit,
        totalCostCents:       cnt * unit,
        avgInitialWeightG:    parseFloat(values.avgInitialWeightG) || undefined,
        breedOrStrain:        values.breedOrStrain || undefined,
        notes:                values.notes || undefined,
        syncStatus:           'pending',
        createdAt:            now,
        updatedAt:            now,
      }
      await db.placementRecords.put(record)
      setIsSuccess(true)
      addToast({ message: 'Placement record saved', type: 'success' })
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
          <p className="text-white font-semibold text-lg leading-tight">Placement Record</p>
          <p className="text-white/60 text-xs">Initial stock placement event</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pb-8">

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Placement Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placement date</label>
              <input type="date" {...register('placementDate')} className="input-base" />
            </div>
            <NumberInput
              label="Count (birds / animals)"
              value={watch('count')}
              onChange={(v) => setValue('count', v)}
              min="1"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Breed / strain</label>
              <input {...register('breedOrStrain')} placeholder="e.g. Lohmann Brown, Ross 308" className="input-base" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Source & Cost</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source / hatchery</label>
              <input {...register('source')} placeholder="e.g. ABC Hatchery" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier name</label>
              <input {...register('supplier')} placeholder="Supplier or farm name" className="input-base" />
            </div>
            <NumberInput
              label="Unit cost"
              unit="each"
              isDecimal
              value={watch('unitCostCents')}
              onChange={(v) => setValue('unitCostCents', v)}
              min="0"
            />
            {totalCents > 0 && (
              <p className="text-xs text-gray-500">
                Total cost: <span className="font-semibold text-gray-700">{(totalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Initial Weight</h3>
            <NumberInput
              label="Avg initial weight"
              unit="g"
              isDecimal
              value={watch('avgInitialWeightG')}
              onChange={(v) => setValue('avgInitialWeightG', v)}
              min="0"
            />
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
