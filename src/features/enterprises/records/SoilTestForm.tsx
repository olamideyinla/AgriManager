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
import type { SoilTestRecord } from '../../../shared/types'

interface FormValues {
  testDate: string
  lab: string
  ph: string
  nitrogenKgHa: string
  phosphorusKgHa: string
  potassiumKgHa: string
  organicMatterPct: string
  recommendation: string
  notes: string
}

export default function SoilTestForm() {
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
      testDate: today,
      lab: '',
      ph: '',
      nitrogenKgHa: '',
      phosphorusKgHa: '',
      potassiumKgHa: '',
      organicMatterPct: '',
      recommendation: '',
      notes: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    if (!enterpriseId) return
    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      const record: SoilTestRecord = {
        id:                   nanoid(),
        enterpriseInstanceId: enterpriseId,
        organizationId:       orgId,
        testDate:             values.testDate,
        lab:                  values.lab || undefined,
        ph:                   parseFloat(values.ph) || undefined,
        nitrogenKgHa:         parseFloat(values.nitrogenKgHa) || undefined,
        phosphorusKgHa:       parseFloat(values.phosphorusKgHa) || undefined,
        potassiumKgHa:        parseFloat(values.potassiumKgHa) || undefined,
        organicMatterPct:     parseFloat(values.organicMatterPct) || undefined,
        recommendation:       values.recommendation || undefined,
        notes:                values.notes || undefined,
        syncStatus:           'pending',
        createdAt:            now,
        updatedAt:            now,
      }
      await db.soilTestRecords.put(record)
      setIsSuccess(true)
      addToast({ message: 'Soil test saved', type: 'success' })
      setTimeout(() => navigate(-1), 900)
    } catch {
      addToast({ message: 'Failed to save — try again', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const ph = parseFloat(watch('ph'))
  const phColor = !ph ? 'text-gray-500' : ph < 5.5 ? 'text-amber-600' : ph > 7.5 ? 'text-blue-600' : 'text-emerald-600'
  const phLabel = !ph ? '' : ph < 5.5 ? 'Acidic' : ph > 7.5 ? 'Alkaline' : 'Optimal'

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
          <p className="text-white font-semibold text-lg leading-tight">Soil Test Record</p>
          <p className="text-white/60 text-xs">Soil analysis results</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pb-8">

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Test Info</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test date</label>
              <input type="date" {...register('testDate')} className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Laboratory</label>
              <input {...register('lab')} placeholder="Lab name (optional)" className="input-base" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Results</h3>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <NumberInput
                  label="pH"
                  isDecimal
                  value={watch('ph')}
                  onChange={(v) => setValue('ph', v)}
                  min="0"
                />
              </div>
              {phLabel && (
                <span className={`text-sm font-semibold mb-2 ${phColor}`}>{phLabel}</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <NumberInput
                label="N (kg/ha)"
                isDecimal
                value={watch('nitrogenKgHa')}
                onChange={(v) => setValue('nitrogenKgHa', v)}
                min="0"
              />
              <NumberInput
                label="P (kg/ha)"
                isDecimal
                value={watch('phosphorusKgHa')}
                onChange={(v) => setValue('phosphorusKgHa', v)}
                min="0"
              />
              <NumberInput
                label="K (kg/ha)"
                isDecimal
                value={watch('potassiumKgHa')}
                onChange={(v) => setValue('potassiumKgHa', v)}
                min="0"
              />
            </div>
            <NumberInput
              label="Organic matter"
              unit="%"
              isDecimal
              value={watch('organicMatterPct')}
              onChange={(v) => setValue('organicMatterPct', v)}
              min="0"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Recommendation</h3>
            <textarea
              {...register('recommendation')}
              rows={3}
              placeholder="Lab recommendation or action plan…"
              className="input-base resize-none"
            />
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
