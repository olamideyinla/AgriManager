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
import type { ThinningRecord } from '../../../shared/types'

interface FormValues {
  date: string
  count: string
  avgWeightKg: string
  reason: string
  disposal: 'sold' | 'culled' | 'transferred'
  proceedsAmountCents: string
  notes: string
}

export default function ThinningRecordForm() {
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
      count: '',
      avgWeightKg: '',
      reason: '',
      disposal: 'sold',
      proceedsAmountCents: '',
      notes: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    if (!enterpriseId) return
    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      const record: ThinningRecord = {
        id:                   nanoid(),
        enterpriseInstanceId: enterpriseId,
        organizationId:       orgId,
        date:                 values.date,
        count:                parseInt(values.count) || 0,
        avgWeightKg:          parseFloat(values.avgWeightKg) || undefined,
        reason:               values.reason || undefined,
        disposal:             values.disposal,
        proceedsAmountCents:  Math.round((parseFloat(values.proceedsAmountCents) || 0) * 100),
        notes:                values.notes || undefined,
        syncStatus:           'pending',
        createdAt:            now,
        updatedAt:            now,
      }
      await db.thinningRecords.put(record)
      setIsSuccess(true)
      addToast({ message: 'Thinning record saved', type: 'success' })
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
          <p className="text-white font-semibold text-lg leading-tight">Thinning / Culling Record</p>
          <p className="text-white/60 text-xs">Stock removal event</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pb-8">

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Event Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" {...register('date')} className="input-base" />
            </div>
            <NumberInput
              label="Count removed"
              value={watch('count')}
              onChange={(v) => setValue('count', v)}
              min="1"
            />
            <NumberInput
              label="Avg weight"
              unit="kg"
              isDecimal
              value={watch('avgWeightKg')}
              onChange={(v) => setValue('avgWeightKg', v)}
              min="0"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <input {...register('reason')} placeholder="e.g. Underperformers, Market size reached" className="input-base" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Disposal</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disposal method</label>
              <select {...register('disposal')} className="input-base">
                <option value="sold">Sold</option>
                <option value="culled">Culled</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>
            <NumberInput
              label="Proceeds"
              isDecimal
              value={watch('proceedsAmountCents')}
              onChange={(v) => setValue('proceedsAmountCents', v)}
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
