import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../../stores/auth-store'
import { useUIStore } from '../../../stores/ui-store'
import { db } from '../../../core/database/db'
import { newId, nowIso } from '../../../shared/types/base'
import { useMachines } from '../../../core/database/hooks/use-machinery'
import { SaveButton } from '../../../shared/components/entry/SaveButton'

interface FormValues {
  machineId: string
  date: string
  hoursUsed: string
  kmDriven: string
  purpose: string
  enterpriseId: string
  operatedBy: string
  notes: string
}

export default function LogUsageForm() {
  const navigate = useNavigate()
  const { id: routeMachineId } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const orgId = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const addToast = useUIStore(s => s.addToast)

  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const preselected = routeMachineId ?? params.get('machineId') ?? ''
  const machines = useMachines(orgId) ?? []
  const enterprises = useLiveQuery(
    () => db.enterpriseInstances.where('status').equals('active').toArray(), [],
  ) ?? []

  const { register, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      machineId: preselected,
      date: format(new Date(), 'yyyy-MM-dd'),
      hoursUsed: '', kmDriven: '', purpose: '', enterpriseId: '', operatedBy: '', notes: '',
    },
  })

  const machineId = watch('machineId')
  const machine = machines.find(m => m.id === machineId)
  const isVehicleLike = machine?.category === 'vehicle' || machine?.category === 'tractor'

  async function onSubmit(values: FormValues) {
    if (!orgId || !values.machineId) return
    setIsSaving(true)
    try {
      const now = nowIso()
      const hoursUsed = values.hoursUsed ? parseFloat(values.hoursUsed) : null
      const kmDriven = values.kmDriven ? parseFloat(values.kmDriven) : null

      await db.usageLogs.add({
        id: newId(),
        machineId: values.machineId,
        date: values.date,
        hoursUsed,
        kmDriven,
        purpose: values.purpose.trim(),
        enterpriseInstanceId: values.enterpriseId || null,
        operatedBy: values.operatedBy.trim() || null,
        notes: values.notes.trim() || null,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      })

      // Roll usage into the machine's cumulative counters
      if (machine) {
        const updates: Record<string, unknown> = {}
        if (hoursUsed != null) updates.hoursCounter = (machine.hoursCounter ?? 0) + hoursUsed
        if (kmDriven != null) updates.odometerKm = (machine.odometerKm ?? 0) + kmDriven
        if (Object.keys(updates).length > 0) {
          await db.machines.update(machine.id, { ...updates, updatedAt: now, syncStatus: 'pending' })
        }
      }

      setIsSuccess(true)
      addToast({ message: 'Usage logged', type: 'success' })
      setTimeout(() => navigate(`/machinery/${values.machineId}`), 700)
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
        <p className="text-white font-semibold text-lg">Log Usage</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            {!routeMachineId && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Machine *</label>
                <select {...register('machineId', { required: true })} className="input-base bg-white">
                  <option value="">Select machine…</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input type="date" {...register('date', { required: true })} className="input-base" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hours Used</label>
                <input type="number" step="0.1" min="0" {...register('hoursUsed')} className="input-base" />
              </div>
              {isVehicleLike && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Km Driven</label>
                  <input type="number" step="0.1" min="0" {...register('kmDriven')} className="input-base" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Purpose *</label>
              <input type="text" placeholder="e.g. Pumping water to fish ponds" {...register('purpose', { required: true })} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Enterprise</label>
              <select {...register('enterpriseId')} className="input-base bg-white">
                <option value="">Farm / General</option>
                {enterprises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Operated By</label>
              <input type="text" {...register('operatedBy')} className="input-base" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea {...register('notes')} rows={2} className="input-base resize-none" />
          </div>

          <SaveButton isLoading={isSaving} isSuccess={isSuccess} label="Log Usage" />
        </form>
      </div>
    </div>
  )
}
