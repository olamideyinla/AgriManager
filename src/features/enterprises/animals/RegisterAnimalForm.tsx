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
import type { AnimalRecord, AnimalSex, AnimalStatus } from '../../../shared/types'

interface FormValues {
  tagId: string
  name: string
  sex: AnimalSex
  birthDate: string
  breedOrStrain: string
  acquisitionDate: string
  acquisitionCost: string
  damTag: string
  sireTag: string
  notes: string
}

export default function RegisterAnimalForm() {
  const { id: enterpriseId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const orgId    = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const addToast = useUIStore(s => s.addToast)
  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      tagId: '',
      name: '',
      sex: 'unknown',
      birthDate: '',
      breedOrStrain: '',
      acquisitionDate: today,
      acquisitionCost: '',
      damTag: '',
      sireTag: '',
      notes: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    if (!enterpriseId || !values.tagId.trim()) {
      addToast({ message: 'Tag ID is required', type: 'error' })
      return
    }
    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      const record: AnimalRecord = {
        id:                   nanoid(),
        enterpriseInstanceId: enterpriseId,
        organizationId:       orgId,
        tagId:                values.tagId.trim(),
        name:                 values.name.trim() || undefined,
        sex:                  values.sex,
        birthDate:            values.birthDate || undefined,
        breedOrStrain:        values.breedOrStrain.trim() || undefined,
        acquisitionDate:      values.acquisitionDate,
        acquisitionCostCents: values.acquisitionCost ? Math.round(parseFloat(values.acquisitionCost) * 100) : undefined,
        damId:                undefined,  // tag-based lookup deferred
        sireId:               undefined,
        status:               'active' as AnimalStatus,
        notes:                values.notes.trim() || undefined,
        syncStatus:           'pending',
        createdAt:            now,
        updatedAt:            now,
      }
      await db.animalRecords.put(record)
      setIsSuccess(true)
      addToast({ message: 'Animal registered', type: 'success' })
      setTimeout(() => navigate(-1), 900)
    } catch {
      addToast({ message: 'Failed to save — try again', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const sex = watch('sex')

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
          <p className="text-white font-semibold text-lg leading-tight">Register Animal</p>
          <p className="text-white/60 text-xs">Add individual animal to registry</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pb-8">

          {/* Identity */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Identity</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tag ID <span className="text-red-500">*</span></label>
              <input
                {...register('tagId', { required: true })}
                placeholder="Ear tag / RFID / collar number"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
              <input {...register('name')} placeholder="e.g. Bessie" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
              <div className="flex gap-2">
                {(['male', 'female', 'unknown'] as AnimalSex[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setValue('sex', s)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors capitalize ${
                      sex === s
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    {s === 'male' ? '♂ Male' : s === 'female' ? '♀ Female' : '? Unknown'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Origin */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Origin</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Breed / strain</label>
              <input {...register('breedOrStrain')} placeholder="e.g. Friesian, Duroc" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birth date</label>
              <input type="date" {...register('birthDate')} className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition date</label>
              <input type="date" {...register('acquisitionDate')} className="input-base" />
            </div>
            <NumberInput
              label="Acquisition cost"
              unit="$"
              isDecimal
              value={watch('acquisitionCost')}
              onChange={v => setValue('acquisitionCost', v)}
              min="0"
            />
          </div>

          {/* Parentage */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Parentage (optional)</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dam tag (mother)</label>
              <input {...register('damTag')} placeholder="Mother's tag ID" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sire tag (father)</label>
              <input {...register('sireTag')} placeholder="Father's tag ID" className="input-base" />
            </div>
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
