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
import type { ReproductiveEventType, WithdrawalRecord } from '../../../shared/types'

const EVENT_TYPES: { value: ReproductiveEventType; label: string }[] = [
  { value: 'heat_observed',            label: '🔥 Heat Observed' },
  { value: 'service_natural',          label: '🐂 Natural Service' },
  { value: 'service_ai',               label: '💉 AI Service' },
  { value: 'pregnancy_check_positive', label: '✅ Pregnancy Check — Positive' },
  { value: 'pregnancy_check_negative', label: '❌ Pregnancy Check — Negative' },
  { value: 'farrowing',                label: '🐷 Farrowing' },
  { value: 'calving',                  label: '🐄 Calving' },
  { value: 'kindling',                 label: '🐰 Kindling' },
  { value: 'weaning',                  label: '🍼 Weaning' },
  { value: 'dry_off',                  label: '🥛 Dry Off' },
  { value: 'abortion',                 label: '⚠️ Abortion' },
]

const BIRTH_TYPES: ReproductiveEventType[] = ['farrowing', 'calving', 'kindling']
const SERVICE_TYPES: ReproductiveEventType[] = ['service_natural', 'service_ai']

interface FormValues {
  eventType: ReproductiveEventType
  eventDate: string
  animalTagId: string
  litterSize: string
  litterSizeAlive: string
  maleCount: string
  femaleCount: string
  weaningWeight: string
  gestationDays: string
  sireTagId: string
  damTagId: string
  notes: string
}

export default function RecordReproductiveEventForm() {
  const { id: enterpriseId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId   = useAuthStore(s => s.user?.id) ?? ''
  const addToast = useUIStore(s => s.addToast)
  const [isSaving, setIsSaving]   = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const { register, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      eventType:    'heat_observed',
      eventDate:    today,
      animalTagId:  '',
      litterSize:   '',
      litterSizeAlive: '',
      maleCount:    '',
      femaleCount:  '',
      weaningWeight:'',
      gestationDays:'',
      sireTagId:    '',
      damTagId:     '',
      notes:        '',
    },
  })

  const eventType = watch('eventType')
  const isBirth   = BIRTH_TYPES.includes(eventType)
  const isService = SERVICE_TYPES.includes(eventType)

  const onSubmit = async (values: FormValues) => {
    if (!enterpriseId) return
    setIsSaving(true)
    try {
      await db.reproductiveEvents.add({
        id:                  nanoid(),
        enterpriseInstanceId: enterpriseId,
        animalId:            undefined,
        animalTagId:         values.animalTagId || undefined,
        eventType:           values.eventType,
        eventDate:           values.eventDate,
        litterSize:          values.litterSize       ? Number(values.litterSize)       : undefined,
        litterSizeAlive:     values.litterSizeAlive  ? Number(values.litterSizeAlive)  : undefined,
        maleCount:           values.maleCount        ? Number(values.maleCount)        : undefined,
        femaleCount:         values.femaleCount      ? Number(values.femaleCount)      : undefined,
        weaningWeight:       values.weaningWeight    ? Number(values.weaningWeight)    : undefined,
        gestationDays:       values.gestationDays    ? Number(values.gestationDays)    : undefined,
        sireTagId:           values.sireTagId        || undefined,
        damTagId:            values.damTagId         || undefined,
        notes:               values.notes            || undefined,
        recordedBy:          userId,
        syncStatus:          'pending',
        createdAt:           new Date(),
        updatedAt:           new Date(),
      })
      setIsSuccess(true)
      addToast({ type: 'success', message: 'Reproductive event recorded' })
      setTimeout(() => navigate(-1), 900)
    } catch {
      addToast({ type: 'error', message: 'Failed to save event' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <div className="bg-primary-600 px-4 pt-safe-top pb-4">
        <div className="flex items-center gap-3 mt-2">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white -ml-2">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold leading-tight">Record Reproductive Event</h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 space-y-4 pb-28">

        {/* Event type */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Event</h2>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Event Type</label>
            <select
              {...register('eventType')}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {EVENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Date</label>
            <input
              type="date"
              {...register('eventDate', { required: true })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Animal Tag ID (optional)</label>
            <input
              type="text"
              placeholder="e.g. T-042"
              {...register('animalTagId')}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>

        {/* Birth details */}
        {isBirth && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Birth Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Total Born</label>
                <NumberInput name="litterSize" register={register} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Born Alive</label>
                <NumberInput name="litterSizeAlive" register={register} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Males</label>
                <NumberInput name="maleCount" register={register} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Females</label>
                <NumberInput name="femaleCount" register={register} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Gestation (days)</label>
                <NumberInput name="gestationDays" register={register} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Weaning Wt (kg avg)</label>
                <NumberInput name="weaningWeight" register={register} placeholder="0.0" decimal />
              </div>
            </div>
          </div>
        )}

        {/* Service details */}
        {isService && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Service Details</h2>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Sire Tag ID</label>
              <input
                type="text"
                placeholder="Father's tag"
                {...register('sireTagId')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Dam Tag ID</label>
              <input
                type="text"
                placeholder="Mother's tag"
                {...register('damTagId')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Any observations…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        <SaveButton isSaving={isSaving} isSuccess={isSuccess} label="Save Event" />
      </form>
    </div>
  )
}
