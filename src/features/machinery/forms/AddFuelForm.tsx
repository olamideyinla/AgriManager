import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../../stores/auth-store'
import { useUIStore } from '../../../stores/ui-store'
import { useCurrency } from '../../../shared/hooks/useCurrency'
import { db } from '../../../core/database/db'
import { newId, nowIso } from '../../../shared/types/base'
import { useMachines, useFuelLogs } from '../../../core/database/hooks/use-machinery'
import { useLiveQuery } from 'dexie-react-hooks'
import { SaveButton } from '../../../shared/components/entry/SaveButton'

interface FormValues {
  machineId: string
  date: string
  quantity: string
  unitCost: string
  hourMeterReading: string
  odometerReading: string
  fuelType: string
  supplier: string
  enterpriseId: string
  receiptReference: string
  notes: string
}

export default function AddFuelForm() {
  const navigate = useNavigate()
  const { id: routeMachineId } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const orgId = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const addToast = useUIStore(s => s.addToast)
  const { symbol } = useCurrency()

  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const preselected = routeMachineId ?? params.get('machineId') ?? ''
  const machines = useMachines(orgId) ?? []
  const enterprises = useLiveQuery(
    () => db.enterpriseInstances.where('status').equals('active').toArray(), [],
  ) ?? []

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      machineId: preselected,
      date: format(new Date(), 'yyyy-MM-dd'),
      quantity: '', unitCost: '', hourMeterReading: '', odometerReading: '',
      fuelType: '', supplier: '', enterpriseId: '', receiptReference: '', notes: '',
    },
  })

  const machineId = watch('machineId')
  const machine = machines.find(m => m.id === machineId)
  const lastLogs = useFuelLogs(machineId || undefined)

  useEffect(() => {
    if (machine?.fuelType) setValue('fuelType', machine.fuelType)
  }, [machine, setValue])

  useEffect(() => {
    if (lastLogs && lastLogs.length > 0 && !watch('unitCost')) {
      setValue('unitCost', lastLogs[0].unitCost.toString())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastLogs])

  const quantity = parseFloat(watch('quantity')) || 0
  const unitCost = parseFloat(watch('unitCost')) || 0
  const totalCost = quantity * unitCost

  async function onSubmit(values: FormValues) {
    if (!orgId || !values.machineId) return
    setIsSaving(true)
    try {
      const now = nowIso()
      const txnId = newId()

      await db.financialTransactions.add({
        id: txnId,
        organizationId: orgId,
        enterpriseInstanceId: values.enterpriseId || undefined,
        date: values.date,
        type: 'expense',
        category: 'fuel',
        amount: totalCost,
        paymentMethod: 'cash',
        notes: `Fuel: ${machine?.name ?? ''}`,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      })

      await db.fuelLogs.add({
        id: newId(),
        machineId: values.machineId,
        date: values.date,
        quantity,
        unitCost,
        totalCost,
        hourMeterReading: values.hourMeterReading ? parseFloat(values.hourMeterReading) : null,
        odometerReading: values.odometerReading ? parseFloat(values.odometerReading) : null,
        fuelType: values.fuelType || 'diesel',
        supplier: values.supplier.trim() || null,
        receiptReference: values.receiptReference.trim() || null,
        enterpriseInstanceId: values.enterpriseId || null,
        linkedFinancialTransactionId: txnId,
        notes: values.notes.trim() || null,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      })

      // Update machine meters if newer
      if (machine) {
        const updates: Record<string, unknown> = {}
        const hourReading = values.hourMeterReading ? parseFloat(values.hourMeterReading) : null
        const odoReading = values.odometerReading ? parseFloat(values.odometerReading) : null
        if (hourReading != null && (machine.hoursCounter == null || hourReading > machine.hoursCounter)) updates.hoursCounter = hourReading
        if (odoReading != null && (machine.odometerKm == null || odoReading > machine.odometerKm)) updates.odometerKm = odoReading
        if (Object.keys(updates).length > 0) {
          await db.machines.update(machine.id, { ...updates, updatedAt: now, syncStatus: 'pending' })
        }
      }

      setIsSuccess(true)
      addToast({ message: 'Fuel entry recorded', type: 'success' })
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
        <p className="text-white font-semibold text-lg">Add Fuel Entry</p>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity (L) *</label>
                <input type="number" step="0.01" min="0" {...register('quantity', { required: true })} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cost / Liter ({symbol})</label>
                <input type="number" step="0.01" min="0" {...register('unitCost', { required: true })} className="input-base" />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-50">
              <span className="text-sm font-semibold text-gray-700">Total Cost</span>
              <span className="text-lg font-bold text-primary-700">{symbol}{totalCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hour Meter</label>
                <input type="number" step="0.1" {...register('hourMeterReading')} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Odometer (km)</label>
                <input type="number" step="0.1" {...register('odometerReading')} className="input-base" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
              <input type="text" {...register('supplier')} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Charge to Enterprise</label>
              <select {...register('enterpriseId')} className="input-base bg-white">
                <option value="">Farm / General</option>
                {enterprises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Receipt Reference</label>
              <input type="text" {...register('receiptReference')} className="input-base" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea {...register('notes')} rows={2} className="input-base resize-none" />
          </div>

          <SaveButton isLoading={isSaving} isSuccess={isSuccess} label="Add Fuel Entry" />
        </form>
      </div>
    </div>
  )
}
