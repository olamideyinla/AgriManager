import { useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { ArrowLeft, Camera } from 'lucide-react'
import { useAuthStore } from '../../../stores/auth-store'
import { useUIStore } from '../../../stores/ui-store'
import { useCurrency } from '../../../shared/hooks/useCurrency'
import { db } from '../../../core/database/db'
import { newId, nowIso } from '../../../shared/types/base'
import { useMachine } from '../../../core/database/hooks/use-machinery'
import { SaveButton } from '../../../shared/components/entry/SaveButton'
import type { MachineCategory, FuelType } from '../../../shared/types'

const CATEGORIES: { value: MachineCategory; label: string }[] = [
  { value: 'generator', label: '🔌 Generator' },
  { value: 'pump', label: '💧 Water Pump' },
  { value: 'tractor', label: '🚜 Tractor' },
  { value: 'vehicle', label: '🚗 Vehicle' },
  { value: 'processing', label: '⚙️ Processing Machine' },
  { value: 'irrigation', label: '🌊 Irrigation System' },
  { value: 'sprayer', label: '🧴 Sprayer' },
  { value: 'incubator', label: '🐣 Incubator' },
  { value: 'cold_storage', label: '❄️ Cold Storage' },
  { value: 'feed_mill', label: '🏭 Feed Mill' },
  { value: 'tools', label: '🔧 Tools' },
  { value: 'other', label: '📦 Other' },
]

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'solar', label: 'Solar' },
  { value: 'manual', label: 'Manual' },
  { value: 'none', label: 'None' },
]

interface FormValues {
  name: string
  category: MachineCategory
  make: string
  model: string
  serialNumber: string
  yearOfManufacture: string
  purchaseDate: string
  purchasePrice: string
  fuelType: FuelType | ''
  fuelCapacityLiters: string
  hoursCounter: string
  odometerKm: string
  assignedLocationId: string
  assignedEnterpriseIds: string[]
  trackDepreciation: boolean
  usefulLifeYears: string
  residualValue: string
  notes: string
}

export default function AddMachineForm() {
  const navigate = useNavigate()
  const { id: machineId } = useParams<{ id: string }>()
  const isEdit = !!machineId
  const orgId = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const addToast = useUIStore(s => s.addToast)
  const { symbol } = useCurrency()
  const existing = useMachine(machineId)

  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)

  const locations = useLiveQuery(async () => {
    if (!orgId) return []
    return db.farmLocations.where('organizationId').equals(orgId).toArray()
  }, [orgId]) ?? []

  const enterprises = useLiveQuery(
    () => db.enterpriseInstances.where('status').equals('active').toArray(), [],
  ) ?? []

  const { register, control, handleSubmit, watch, reset } = useForm<FormValues>({
    defaultValues: {
      name: '', category: 'generator', make: '', model: '', serialNumber: '',
      yearOfManufacture: '', purchaseDate: format(new Date(), 'yyyy-MM-dd'), purchasePrice: '',
      fuelType: '', fuelCapacityLiters: '', hoursCounter: '', odometerKm: '',
      assignedLocationId: '', assignedEnterpriseIds: [],
      trackDepreciation: false, usefulLifeYears: '', residualValue: '',
      notes: '',
    },
  })

  if (isEdit && existing && !watch('name')) {
    reset({
      name: existing.name, category: existing.category,
      make: existing.make ?? '', model: existing.model ?? '', serialNumber: existing.serialNumber ?? '',
      yearOfManufacture: existing.yearOfManufacture?.toString() ?? '',
      purchaseDate: existing.purchaseDate ?? format(new Date(), 'yyyy-MM-dd'),
      purchasePrice: existing.purchasePrice?.toString() ?? '',
      fuelType: existing.fuelType ?? '',
      fuelCapacityLiters: existing.fuelCapacityLiters?.toString() ?? '',
      hoursCounter: existing.hoursCounter?.toString() ?? '',
      odometerKm: existing.odometerKm?.toString() ?? '',
      assignedLocationId: existing.assignedLocationId ?? '',
      assignedEnterpriseIds: existing.assignedEnterpriseIds,
      trackDepreciation: existing.depreciationMethod === 'straight_line',
      usefulLifeYears: existing.usefulLifeYears?.toString() ?? '',
      residualValue: existing.residualValue?.toString() ?? '',
      notes: existing.notes ?? '',
    })
    setPhotoDataUrl(existing.photoUrl ?? null)
  }

  const trackDepreciation = watch('trackDepreciation')
  const category = watch('category')
  const isVehicleLike = category === 'vehicle' || category === 'tractor'

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhotoDataUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function onSubmit(values: FormValues) {
    if (!orgId) return
    setIsSaving(true)
    try {
      const id = isEdit ? machineId! : newId()
      const now = nowIso()
      const purchasePrice = values.purchasePrice ? parseFloat(values.purchasePrice) : null

      await db.machines.put({
        id,
        organizationId: orgId,
        name: values.name.trim(),
        category: values.category,
        make: values.make.trim() || null,
        model: values.model.trim() || null,
        serialNumber: values.serialNumber.trim() || null,
        yearOfManufacture: values.yearOfManufacture ? parseInt(values.yearOfManufacture, 10) : null,
        purchaseDate: values.purchaseDate || null,
        purchasePrice,
        currentEstimatedValue: existing?.currentEstimatedValue ?? null,
        depreciationMethod: values.trackDepreciation ? 'straight_line' : 'none',
        usefulLifeYears: values.trackDepreciation && values.usefulLifeYears ? parseInt(values.usefulLifeYears, 10) : null,
        residualValue: values.trackDepreciation && values.residualValue ? parseFloat(values.residualValue) : null,
        fuelType: values.fuelType || null,
        fuelCapacityLiters: values.fuelCapacityLiters ? parseFloat(values.fuelCapacityLiters) : null,
        averageFuelConsumption: existing?.averageFuelConsumption ?? null,
        hoursCounter: values.hoursCounter ? parseFloat(values.hoursCounter) : null,
        odometerKm: values.odometerKm ? parseFloat(values.odometerKm) : null,
        assignedLocationId: values.assignedLocationId || null,
        assignedEnterpriseIds: values.assignedEnterpriseIds,
        status: existing?.status ?? 'active',
        photoUrl: photoDataUrl,
        insuranceProvider: existing?.insuranceProvider ?? null,
        insurancePolicyNumber: existing?.insurancePolicyNumber ?? null,
        insuranceExpiryDate: existing?.insuranceExpiryDate ?? null,
        notes: values.notes.trim() || null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        syncStatus: 'pending',
      })

      // Auto-create a financial transaction for the purchase (new machines only)
      if (!isEdit && purchasePrice && purchasePrice > 0) {
        await db.financialTransactions.add({
          id: newId(),
          organizationId: orgId,
          date: values.purchaseDate || format(new Date(), 'yyyy-MM-dd'),
          type: 'expense',
          category: 'equipment',
          amount: purchasePrice,
          paymentMethod: 'cash',
          notes: `Purchase: ${values.name.trim()}`,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        })
      }

      setIsSuccess(true)
      addToast({ message: isEdit ? 'Machine updated' : 'Machine added', type: 'success' })
      setTimeout(() => navigate(isEdit ? `/machinery/${id}` : '/machinery'), 700)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      <div className="bg-primary-600 px-4 pt-3 pb-4 safe-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white active:scale-95">
          <ArrowLeft size={22} />
        </button>
        <p className="text-white font-semibold text-lg">{isEdit ? 'Edit Machine' : 'Add Machine'}</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pb-8">
          {/* Photo */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <label className="flex flex-col items-center gap-2 border border-dashed border-gray-300 rounded-xl py-6 cursor-pointer hover:bg-gray-50">
              {photoDataUrl ? (
                <img src={photoDataUrl} alt="Machine" className="w-20 h-20 rounded-xl object-cover" />
              ) : (
                <Camera size={28} className="text-gray-300" />
              )}
              <span className="text-xs text-gray-500">{photoDataUrl ? 'Change photo' : 'Take or choose photo'}</span>
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handlePhotoChange} />
            </label>
          </div>

          {/* Basic info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Basic Information</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input type="text" {...register('name', { required: true })} placeholder="e.g. Generator — 10KVA Lutian" className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
              <select {...register('category', { required: true })} className="input-base bg-white">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Make</label>
                <input type="text" {...register('make')} placeholder="Lutian" className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                <input type="text" {...register('model')} placeholder="LT10GF" className="input-base" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Serial Number</label>
                <input type="text" {...register('serialNumber')} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                <input type="number" {...register('yearOfManufacture')} placeholder="2023" className="input-base" />
              </div>
            </div>
          </div>

          {/* Purchase */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Purchase Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Date</label>
                <input type="date" {...register('purchaseDate')} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Price ({symbol})</label>
                <input type="number" step="0.01" min="0" {...register('purchasePrice')} placeholder="0.00" className="input-base" />
              </div>
            </div>
          </div>

          {/* Fuel & meters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Fuel & Meters</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fuel Type</label>
                <select {...register('fuelType')} className="input-base bg-white">
                  <option value="">—</option>
                  {FUEL_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fuel Capacity (L)</label>
                <input type="number" step="0.1" min="0" {...register('fuelCapacityLiters')} className="input-base" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hour Meter Reading</label>
                <input type="number" step="0.1" min="0" {...register('hoursCounter')} className="input-base" />
              </div>
              {isVehicleLike && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Odometer (km)</label>
                  <input type="number" step="0.1" min="0" {...register('odometerKm')} className="input-base" />
                </div>
              )}
            </div>
          </div>

          {/* Assignment */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Assignment</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <select {...register('assignedLocationId')} className="input-base bg-white">
                <option value="">—</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Enterprises using this machine</label>
              <Controller
                control={control}
                name="assignedEnterpriseIds"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {enterprises.map(e => {
                      const checked = field.value.includes(e.id)
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => field.onChange(checked ? field.value.filter(id => id !== e.id) : [...field.value, e.id])}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            checked ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          {e.name}
                        </button>
                      )
                    })}
                    {enterprises.length === 0 && <p className="text-xs text-gray-400">No active enterprises yet</p>}
                  </div>
                )}
              />
            </div>
          </div>

          {/* Depreciation */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Depreciation</h3>
              <Controller
                control={control}
                name="trackDepreciation"
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${field.value ? 'bg-primary-600' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${field.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                )}
              />
            </div>
            {trackDepreciation && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Useful Life (years)</label>
                  <input type="number" min="1" {...register('usefulLifeYears')} placeholder="10" className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Residual Value ({symbol})</label>
                  <input type="number" step="0.01" min="0" {...register('residualValue')} placeholder="0" className="input-base" />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea {...register('notes')} rows={2} className="input-base resize-none" />
          </div>

          <SaveButton isLoading={isSaving} isSuccess={isSuccess} label={isEdit ? 'Save Changes' : 'Add Machine'} />
        </form>
      </div>
    </div>
  )
}
