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
import type { PostHarvestRecord } from '../../../shared/types'

interface FormValues {
  date: string
  totalHarvestKg: string
  gradeAKg: string
  gradeBKg: string
  gradeCKg: string
  storedKg: string
  soldKg: string
  wasteKg: string
  storageLocation: string
  storageMethod: string
  processingMethod: string
  notes: string
}

export default function PostHarvestForm() {
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
      date: today,
      totalHarvestKg: '',
      gradeAKg: '',
      gradeBKg: '',
      gradeCKg: '',
      storedKg: '',
      soldKg: '',
      wasteKg: '',
      storageLocation: '',
      storageMethod: '',
      processingMethod: '',
      notes: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    if (!enterpriseId) return
    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      const record: PostHarvestRecord = {
        id:                   nanoid(),
        enterpriseInstanceId: enterpriseId,
        organizationId:       orgId,
        date:                 values.date,
        totalHarvestKg:       parseFloat(values.totalHarvestKg) || 0,
        gradeAKg:             parseFloat(values.gradeAKg) || undefined,
        gradeBKg:             parseFloat(values.gradeBKg) || undefined,
        gradeCKg:             parseFloat(values.gradeCKg) || undefined,
        storedKg:             parseFloat(values.storedKg) || undefined,
        soldKg:               parseFloat(values.soldKg) || undefined,
        wasteKg:              parseFloat(values.wasteKg) || undefined,
        storageLocation:      values.storageLocation || undefined,
        storageMethod:        values.storageMethod || undefined,
        processingMethod:     values.processingMethod || undefined,
        notes:                values.notes || undefined,
        syncStatus:           'pending',
        createdAt:            now,
        updatedAt:            now,
      }
      await db.postHarvestRecords.put(record)
      setIsSuccess(true)
      addToast({ message: 'Post-harvest record saved', type: 'success' })
      setTimeout(() => navigate(-1), 900)
    } catch {
      addToast({ message: 'Failed to save — try again', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const totalKg = parseFloat(watch('totalHarvestKg')) || 0
  const graded  = (parseFloat(watch('gradeAKg')) || 0) + (parseFloat(watch('gradeBKg')) || 0) + (parseFloat(watch('gradeCKg')) || 0)
  const ungradedKg = totalKg > 0 && graded > 0 ? Math.max(0, totalKg - graded) : null

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
          <p className="text-white font-semibold text-lg leading-tight">Post-Harvest Record</p>
          <p className="text-white/60 text-xs">Harvest outcome & storage</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pb-8">

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Harvest Summary</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" {...register('date')} className="input-base" />
            </div>
            <NumberInput
              label="Total harvest"
              unit="kg"
              isDecimal
              value={watch('totalHarvestKg')}
              onChange={(v) => setValue('totalHarvestKg', v)}
              min="0"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Grading</h3>
            <div className="grid grid-cols-3 gap-3">
              <NumberInput
                label="Grade A"
                unit="kg"
                isDecimal
                value={watch('gradeAKg')}
                onChange={(v) => setValue('gradeAKg', v)}
                min="0"
              />
              <NumberInput
                label="Grade B"
                unit="kg"
                isDecimal
                value={watch('gradeBKg')}
                onChange={(v) => setValue('gradeBKg', v)}
                min="0"
              />
              <NumberInput
                label="Grade C"
                unit="kg"
                isDecimal
                value={watch('gradeCKg')}
                onChange={(v) => setValue('gradeCKg', v)}
                min="0"
              />
            </div>
            {ungradedKg !== null && ungradedKg > 0 && (
              <p className="text-xs text-amber-600">Ungraded: {ungradedKg.toFixed(1)} kg</p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Disposition</h3>
            <div className="grid grid-cols-3 gap-3">
              <NumberInput
                label="Stored"
                unit="kg"
                isDecimal
                value={watch('storedKg')}
                onChange={(v) => setValue('storedKg', v)}
                min="0"
              />
              <NumberInput
                label="Sold"
                unit="kg"
                isDecimal
                value={watch('soldKg')}
                onChange={(v) => setValue('soldKg', v)}
                min="0"
              />
              <NumberInput
                label="Waste"
                unit="kg"
                isDecimal
                value={watch('wasteKg')}
                onChange={(v) => setValue('wasteKg', v)}
                min="0"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Storage & Processing</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Storage location</label>
              <input {...register('storageLocation')} placeholder="e.g. Warehouse A, Cold room" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Storage method</label>
              <input {...register('storageMethod')} placeholder="e.g. Ambient, Cold storage, Silo" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Processing method</label>
              <input {...register('processingMethod')} placeholder="e.g. Threshing, Milling, Raw" className="input-base" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={2}
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
