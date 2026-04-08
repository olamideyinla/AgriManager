import { useState } from 'react'
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
import type { AnimalWeightEntry } from '../../../shared/types'

interface FormValues {
  date: string
  weightKg: string
  bodyConditionScore: string
  notes: string
}

export default function AddWeightEntryForm() {
  const { id: enterpriseId, animalId } = useParams<{ id: string; animalId: string }>()
  const navigate = useNavigate()
  const orgId    = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const addToast = useUIStore(s => s.addToast)
  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const animal = useLiveQuery(
    () => animalId ? db.animalRecords.get(animalId) : undefined,
    [animalId],
  )

  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      date: today,
      weightKg: '',
      bodyConditionScore: '',
      notes: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    if (!enterpriseId || !animalId) return
    const wt = parseFloat(values.weightKg)
    if (!wt || wt <= 0) {
      addToast({ message: 'Weight is required', type: 'error' })
      return
    }
    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      const bcs = parseFloat(values.bodyConditionScore)
      const record: AnimalWeightEntry = {
        id:                   nanoid(),
        animalId:             animalId,
        enterpriseInstanceId: enterpriseId,
        organizationId:       orgId,
        date:                 values.date,
        weightKg:             wt,
        bodyConditionScore:   !isNaN(bcs) && bcs >= 1 && bcs <= 5 ? bcs : undefined,
        notes:                values.notes.trim() || undefined,
        syncStatus:           'pending',
        createdAt:            now,
        updatedAt:            now,
      }
      await db.animalWeightEntries.put(record)
      setIsSuccess(true)
      addToast({ message: 'Weight logged', type: 'success' })
      setTimeout(() => navigate(-1), 900)
    } catch {
      addToast({ message: 'Failed to save — try again', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const bcs = watch('bodyConditionScore')

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
          <p className="text-white font-semibold text-lg leading-tight">Log Weight</p>
          <p className="text-white/60 text-xs">
            {animal ? `${animal.tagId}${animal.name ? ` · ${animal.name}` : ''}` : 'Weight entry'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pb-8">

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Weigh-in</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" {...register('date')} className="input-base" />
            </div>
            <NumberInput
              label="Weight (kg)"
              unit="kg"
              isDecimal
              value={watch('weightKg')}
              onChange={v => setValue('weightKg', v)}
              min="0"
            />
          </div>

          {/* Body condition score */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Body Condition Score (optional)</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(score => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setValue('bodyConditionScore', bcs === String(score) ? '' : String(score))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                    bcs === String(score)
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">1 = emaciated · 3 = ideal · 5 = obese</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Any additional observations…"
              className="input-base resize-none"
            />
          </div>

          <SaveButton isLoading={isSaving} isSuccess={isSuccess} />
        </form>
      </div>
    </div>
  )
}
