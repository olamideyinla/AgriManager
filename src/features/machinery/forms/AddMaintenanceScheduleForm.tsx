import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { useUIStore } from '../../../stores/ui-store'
import { useCurrency } from '../../../shared/hooks/useCurrency'
import { db } from '../../../core/database/db'
import { newId, nowIso } from '../../../shared/types/base'
import { useMachine } from '../../../core/database/hooks/use-machinery'
import { calculateNextMaintenanceDue } from '../services/machinery-calculator'
import { SaveButton } from '../../../shared/components/entry/SaveButton'
import type { MaintenanceIntervalType } from '../../../shared/types'

const PRESETS = ['Oil Change', 'Filter Change', 'Belt Check', 'Full Service', 'Tyre Check']

const INTERVAL_TYPES: { value: MaintenanceIntervalType; label: string }[] = [
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'km', label: 'Km' },
  { value: 'months', label: 'Months' },
]

interface FormValues {
  name: string
  intervalType: MaintenanceIntervalType
  intervalValue: string
  lastPerformedDate: string
  lastPerformedHours: string
  lastPerformedKm: string
  estimatedCost: string
  notes: string
}

export default function AddMaintenanceScheduleForm() {
  const navigate = useNavigate()
  const { id: machineId } = useParams<{ id: string }>()
  const addToast = useUIStore(s => s.addToast)
  const { symbol } = useCurrency()
  const machine = useMachine(machineId)

  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const { register, control, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      name: '', intervalType: 'hours', intervalValue: '',
      lastPerformedDate: format(new Date(), 'yyyy-MM-dd'),
      lastPerformedHours: '', lastPerformedKm: '',
      estimatedCost: '', notes: '',
    },
  })

  const intervalType = watch('intervalType')

  async function onSubmit(values: FormValues) {
    if (!machineId || !machine) return
    setIsSaving(true)
    try {
      const now = nowIso()
      const schedule = {
        id: newId(),
        machineId,
        name: values.name.trim(),
        intervalType: values.intervalType,
        intervalValue: parseFloat(values.intervalValue) || 0,
        lastPerformedDate: values.lastPerformedDate || null,
        lastPerformedHours: values.lastPerformedHours ? parseFloat(values.lastPerformedHours) : null,
        lastPerformedKm: values.lastPerformedKm ? parseFloat(values.lastPerformedKm) : null,
        nextDueDate: null,
        nextDueHours: null,
        nextDueKm: null,
        estimatedCost: values.estimatedCost ? parseFloat(values.estimatedCost) : null,
        notes: values.notes.trim() || null,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending' as const,
      }
      const due = calculateNextMaintenanceDue(schedule, machine)

      await db.maintenanceSchedules.add({
        ...schedule,
        nextDueDate: due.nextDueDate,
        nextDueHours: due.nextDueHours,
        nextDueKm: due.nextDueKm,
      })

      setIsSuccess(true)
      addToast({ message: 'Maintenance schedule added', type: 'success' })
      setTimeout(() => navigate(`/machinery/${machineId}`), 700)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      <div className="bg-primary-600 px-4 pt-3 pb-4 safe-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80 active:scale-95">
          <ArrowLeft size={22} />
        </button>
        <p className="text-white font-semibold text-lg">Add Maintenance Schedule</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Quick presets</label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setValue('name', p)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 active:bg-gray-200"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Maintenance Name *</label>
              <input type="text" {...register('name', { required: true })} placeholder="e.g. Oil Change" className="input-base" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Interval Type *</label>
                <Controller
                  control={control}
                  name="intervalType"
                  render={({ field }) => (
                    <select {...field} className="input-base bg-white">
                      {INTERVAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Every</label>
                <input type="number" min="1" {...register('intervalValue', { required: true })} placeholder="250" className="input-base" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Last Performed</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" {...register('lastPerformedDate')} className="input-base" />
            </div>
            {intervalType === 'hours' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hour Meter at Last Service</label>
                <input type="number" step="0.1" {...register('lastPerformedHours')} className="input-base" />
              </div>
            )}
            {intervalType === 'km' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Odometer at Last Service</label>
                <input type="number" step="0.1" {...register('lastPerformedKm')} className="input-base" />
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Estimated Cost ({symbol})</label>
            <input type="number" step="0.01" min="0" {...register('estimatedCost')} className="input-base" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea {...register('notes')} rows={2} className="input-base resize-none" />
          </div>

          <SaveButton isLoading={isSaving} isSuccess={isSuccess} label="Add Schedule" />
        </form>
      </div>
    </div>
  )
}
