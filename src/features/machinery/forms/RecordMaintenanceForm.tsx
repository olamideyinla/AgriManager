import { useState, type ChangeEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { format } from 'date-fns'
import { ArrowLeft, Plus, Trash2, Camera } from 'lucide-react'
import { useAuthStore } from '../../../stores/auth-store'
import { useUIStore } from '../../../stores/ui-store'
import { useCurrency } from '../../../shared/hooks/useCurrency'
import { db } from '../../../core/database/db'
import { newId, nowIso } from '../../../shared/types/base'
import { useMachines, useMaintenanceSchedules } from '../../../core/database/hooks/use-machinery'
import { calculateNextMaintenanceDue } from '../services/machinery-calculator'
import { SaveButton } from '../../../shared/components/entry/SaveButton'
import type { MaintenanceType, MaintenancePart } from '../../../shared/types'

const TYPES: { value: MaintenanceType; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled Service' },
  { value: 'repair', label: 'Repair' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'overhaul', label: 'Overhaul' },
]

interface PartRow { name: string; partNumber: string; quantity: string; unitCost: string }

interface FormValues {
  machineId: string
  date: string
  type: MaintenanceType
  scheduleId: string
  description: string
  parts: PartRow[]
  laborDescription: string
  laborCost: string
  otherCost: string
  performedBy: string
  workshopName: string
  hourMeterReading: string
  odometerReading: string
  downtimeDays: string
  nextActionRequired: string
  notes: string
}

export default function RecordMaintenanceForm() {
  const navigate = useNavigate()
  const { id: routeMachineId } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const orgId = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const addToast = useUIStore(s => s.addToast)
  const { symbol } = useCurrency()

  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])

  const preselected = routeMachineId ?? params.get('machineId') ?? ''
  const machines = useMachines(orgId) ?? []

  const { register, control, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      machineId: preselected,
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'scheduled',
      scheduleId: '',
      description: '',
      parts: [],
      laborDescription: '', laborCost: '', otherCost: '',
      performedBy: '', workshopName: '',
      hourMeterReading: '', odometerReading: '',
      downtimeDays: '', nextActionRequired: '', notes: '',
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'parts' })
  const machineId = watch('machineId')
  const type = watch('type')
  const parts = watch('parts')
  const schedules = useMaintenanceSchedules(machineId || undefined) ?? []

  const partsTotal = parts.reduce((s, p) => s + (parseFloat(p.quantity) || 0) * (parseFloat(p.unitCost) || 0), 0)
  const laborCost = parseFloat(watch('laborCost')) || 0
  const otherCost = parseFloat(watch('otherCost')) || 0
  const totalCost = partsTotal + laborCost + otherCost

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhotos(p => [...p, reader.result as string])
    reader.readAsDataURL(file)
  }

  async function onSubmit(values: FormValues) {
    if (!orgId || !values.machineId) return
    setIsSaving(true)
    try {
      const machine = machines.find(m => m.id === values.machineId)
      if (!machine) return
      const now = nowIso()
      const recordId = newId()

      const partsUsed: MaintenancePart[] = values.parts
        .filter(p => p.name.trim())
        .map(p => ({
          name: p.name.trim(),
          partNumber: p.partNumber.trim() || null,
          quantity: parseFloat(p.quantity) || 0,
          unitCost: parseFloat(p.unitCost) || 0,
          totalCost: (parseFloat(p.quantity) || 0) * (parseFloat(p.unitCost) || 0),
        }))

      const hourMeterReading = values.hourMeterReading ? parseFloat(values.hourMeterReading) : null
      const odometerReading = values.odometerReading ? parseFloat(values.odometerReading) : null

      // Auto-create linked financial transaction first, so we can reference its id
      const txnId = newId()
      if (totalCost > 0) {
        await db.financialTransactions.add({
          id: txnId,
          organizationId: orgId,
          date: values.date,
          type: 'expense',
          category: 'equipment',
          amount: totalCost,
          paymentMethod: 'cash',
          notes: `Maintenance: ${machine.name} — ${values.description.trim()}`,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        })
      }

      await db.maintenanceRecords.add({
        id: recordId,
        machineId: values.machineId,
        scheduleId: values.type === 'scheduled' && values.scheduleId ? values.scheduleId : null,
        date: values.date,
        type: values.type,
        description: values.description.trim(),
        partsUsed,
        laborDescription: values.laborDescription.trim() || null,
        laborCost: laborCost || null,
        partsCost: partsTotal || null,
        totalCost,
        otherCost: otherCost || null,
        performedBy: values.performedBy.trim() || null,
        workshopName: values.workshopName.trim() || null,
        hourMeterReading,
        odometerReading,
        downtimeDays: values.downtimeDays ? parseInt(values.downtimeDays, 10) : null,
        nextActionRequired: values.nextActionRequired.trim() || null,
        photoUrls: photos,
        linkedFinancialTransactionId: totalCost > 0 ? txnId : null,
        notes: values.notes.trim() || null,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      })

      // Update machine's hour meter / odometer if a newer reading was given
      const machineUpdates: Record<string, unknown> = { updatedAt: now, syncStatus: 'pending' }
      if (hourMeterReading != null && (machine.hoursCounter == null || hourMeterReading > machine.hoursCounter)) {
        machineUpdates.hoursCounter = hourMeterReading
      }
      if (odometerReading != null && (machine.odometerKm == null || odometerReading > machine.odometerKm)) {
        machineUpdates.odometerKm = odometerReading
      }
      if (Object.keys(machineUpdates).length > 2) {
        await db.machines.update(machine.id, machineUpdates)
      }

      // Update the linked schedule's lastPerformed fields and recalculate next due
      if (values.scheduleId) {
        const schedule = await db.maintenanceSchedules.get(values.scheduleId)
        if (schedule) {
          const updated = {
            ...schedule,
            lastPerformedDate: values.date,
            lastPerformedHours: hourMeterReading ?? schedule.lastPerformedHours,
            lastPerformedKm: odometerReading ?? schedule.lastPerformedKm,
          }
          const due = calculateNextMaintenanceDue(updated, { ...machine, ...machineUpdates } as typeof machine)
          await db.maintenanceSchedules.update(values.scheduleId, {
            lastPerformedDate: updated.lastPerformedDate,
            lastPerformedHours: updated.lastPerformedHours,
            lastPerformedKm: updated.lastPerformedKm,
            nextDueDate: due.nextDueDate,
            nextDueHours: due.nextDueHours,
            nextDueKm: due.nextDueKm,
            updatedAt: now,
            syncStatus: 'pending',
          })
        }
      }

      setIsSuccess(true)
      addToast({ message: 'Maintenance recorded', type: 'success' })
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
        <p className="text-white font-semibold text-lg">Record Maintenance</p>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                <input type="date" {...register('date', { required: true })} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
                <select {...register('type', { required: true })} className="input-base bg-white">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            {type === 'scheduled' && schedules.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Linked Schedule</label>
                <select {...register('scheduleId')} className="input-base bg-white">
                  <option value="">None</option>
                  {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
              <textarea {...register('description', { required: true })} rows={2} placeholder="What was done" className="input-base resize-none" />
            </div>
          </div>

          {/* Parts used */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Parts Used</h3>
            {fields.map((field, idx) => (
              <div key={field.id} className="rounded-xl border border-gray-100 p-3 space-y-2 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Part {idx + 1}</span>
                  <button type="button" onClick={() => remove(idx)} className="w-8 h-8 flex items-center justify-center text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
                <input type="text" placeholder="Part name" {...register(`parts.${idx}.name`)} className="input-base" />
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" placeholder="Part #" {...register(`parts.${idx}.partNumber`)} className="input-base" />
                  <input type="number" step="0.01" placeholder="Qty" {...register(`parts.${idx}.quantity`)} className="input-base" />
                  <input type="number" step="0.01" placeholder={`Cost (${symbol})`} {...register(`parts.${idx}.unitCost`)} className="input-base" />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => append({ name: '', partNumber: '', quantity: '1', unitCost: '' })}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500"
            >
              <Plus size={16} /> Add Part
            </button>
            {partsTotal > 0 && (
              <p className="text-xs text-right text-gray-500">Parts total: <span className="font-semibold">{symbol}{partsTotal.toFixed(2)}</span></p>
            )}
          </div>

          {/* Costs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Costs</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Labor Cost ({symbol})</label>
                <input type="number" step="0.01" min="0" {...register('laborCost')} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Other Costs ({symbol})</label>
                <input type="number" step="0.01" min="0" {...register('otherCost')} className="input-base" />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-50">
              <span className="text-sm font-semibold text-gray-700">Total Cost</span>
              <span className="text-lg font-bold text-primary-700">{symbol}{totalCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Who / where */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Performed By</label>
                <input type="text" placeholder="Mechanic or in-house" {...register('performedBy')} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Workshop</label>
                <input type="text" {...register('workshopName')} className="input-base" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hour Meter Reading</label>
                <input type="number" step="0.1" {...register('hourMeterReading')} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Odometer Reading</label>
                <input type="number" step="0.1" {...register('odometerReading')} className="input-base" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Downtime (days)</label>
              <input type="number" min="0" {...register('downtimeDays')} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Next Action Required</label>
              <input type="text" placeholder="e.g. Replace belt at next service" {...register('nextActionRequired')} className="input-base" />
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
            <label className="text-xs font-semibold text-gray-600 block">Photos</label>
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => <img key={i} src={p} alt="" className="w-16 h-16 rounded-xl object-cover" />)}
              <label className="w-16 h-16 rounded-xl border border-dashed border-gray-300 flex items-center justify-center cursor-pointer">
                <Camera size={18} className="text-gray-400" />
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handlePhotoChange} />
              </label>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea {...register('notes')} rows={2} className="input-base resize-none" />
          </div>

          <SaveButton isLoading={isSaving} isSuccess={isSuccess} label="Record Maintenance" />
        </form>
      </div>
    </div>
  )
}
