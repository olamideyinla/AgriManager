import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { nanoid } from 'nanoid'
import { differenceInDays, format, addDays } from 'date-fns'
import { useAuthStore } from '../../stores/auth-store'
import { useUIStore } from '../../stores/ui-store'
import { db } from '../../core/database/db'
import { useOrgActiveWithdrawals, useWithdrawalRecords } from '../../core/database/hooks/use-withdrawal-records'
import { NumberInput } from '../../shared/components/entry/NumberInput'
import { SaveButton } from '../../shared/components/entry/SaveButton'
import type { WithdrawalRecord } from '../../shared/types'

// ── Withdrawal card ───────────────────────────────────────────────────────────

function WithdrawalCard({ record }: { record: WithdrawalRecord & { enterpriseName?: string } }) {
  const today = new Date().toISOString().slice(0, 10)
  const daysLeft = differenceInDays(new Date(record.withdrawalEndDate), new Date())
  const isActive = record.withdrawalEndDate >= today
  const affects: string[] = []
  if (record.affectsMeat) affects.push('Meat')
  if (record.affectsEggs) affects.push('Eggs')
  if (record.affectsMilk) affects.push('Milk')

  const dateLabel = (() => {
    try { return format(new Date(record.withdrawalEndDate), 'MMM d, yyyy') }
    catch { return record.withdrawalEndDate }
  })()

  return (
    <div className={`rounded-2xl border p-4 flex gap-3 ${
      isActive
        ? daysLeft <= 2 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="mt-0.5 shrink-0">
        {isActive
          ? <AlertTriangle className={`w-5 h-5 ${daysLeft <= 2 ? 'text-red-500' : 'text-amber-500'}`} />
          : <CheckCircle2 className="w-5 h-5 text-gray-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm leading-tight">{record.medicationName}</p>
        {record.activeIngredient && (
          <p className="text-xs text-gray-500 mt-0.5">{record.activeIngredient}</p>
        )}
        {record.enterpriseName && (
          <p className="text-xs text-primary-600 font-medium mt-0.5">{record.enterpriseName}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {affects.map(a => (
            <span key={a} className="text-xs bg-white border border-gray-200 px-1.5 py-0.5 rounded-full text-gray-600 font-medium">
              No {a}
            </span>
          ))}
          <span className="text-xs text-gray-500">
            {record.withdrawalDays}d withdrawal
          </span>
        </div>
        <p className={`text-xs font-semibold mt-1.5 ${
          isActive
            ? daysLeft <= 2 ? 'text-red-600' : 'text-amber-600'
            : 'text-gray-400'
        }`}>
          {isActive
            ? daysLeft === 0
              ? 'Ends today'
              : daysLeft === 1
                ? '1 day remaining'
                : `${daysLeft} days remaining · ends ${dateLabel}`
            : `Cleared ${dateLabel}`
          }
        </p>
      </div>
    </div>
  )
}

// ── Add withdrawal form (bottom sheet) ────────────────────────────────────────

interface FormValues {
  medicationName: string
  activeIngredient: string
  treatmentDate: string
  withdrawalDays: string
  affectsMeat: boolean
  affectsEggs: boolean
  affectsMilk: boolean
  numberOfAnimals: string
  animalTagIds: string
  notes: string
}

function AddWithdrawalForm({
  enterpriseId,
  onClose,
}: {
  enterpriseId: string
  onClose: () => void
}) {
  const userId   = useAuthStore(s => s.user?.id) ?? ''
  const addToast = useUIStore(s => s.addToast)
  const [isSaving, setIsSaving]   = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const { register, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      medicationName:   '',
      activeIngredient: '',
      treatmentDate:    today,
      withdrawalDays:   '',
      affectsMeat: false,
      affectsEggs: false,
      affectsMilk: false,
      numberOfAnimals: '',
      animalTagIds: '',
      notes: '',
    },
  })

  const treatmentDate  = watch('treatmentDate')
  const withdrawalDays = watch('withdrawalDays')
  const endDate = treatmentDate && withdrawalDays
    ? (() => {
        try {
          const d = addDays(new Date(treatmentDate), Number(withdrawalDays))
          return format(d, 'MMM d, yyyy')
        } catch { return '' }
      })()
    : ''

  const onSubmit = async (values: FormValues) => {
    if (!values.medicationName || !values.withdrawalDays) return
    setIsSaving(true)
    try {
      const endDateStr = (() => {
        try {
          return addDays(new Date(values.treatmentDate), Number(values.withdrawalDays))
            .toISOString().slice(0, 10)
        } catch { return values.treatmentDate }
      })()

      await db.withdrawalRecords.add({
        id:                  nanoid(),
        enterpriseInstanceId: enterpriseId,
        medicationName:      values.medicationName,
        activeIngredient:    values.activeIngredient || undefined,
        treatmentDate:       values.treatmentDate,
        withdrawalDays:      Number(values.withdrawalDays),
        withdrawalEndDate:   endDateStr,
        affectsMeat:         values.affectsMeat,
        affectsEggs:         values.affectsEggs,
        affectsMilk:         values.affectsMilk,
        numberOfAnimals:     values.numberOfAnimals ? Number(values.numberOfAnimals) : undefined,
        animalTagIds:        values.animalTagIds || undefined,
        notes:               values.notes || undefined,
        recordedBy:          userId,
        syncStatus:          'pending',
        createdAt:           new Date(),
        updatedAt:           new Date(),
      })
      setIsSuccess(true)
      addToast({ type: 'success', message: 'Withdrawal record added' })
      setTimeout(onClose, 900)
    } catch {
      addToast({ type: 'error', message: 'Failed to save' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Medication Name *</label>
          <input
            type="text"
            {...register('medicationName', { required: true })}
            placeholder="e.g. Oxytetracycline"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Active Ingredient (optional)</label>
          <input
            type="text"
            {...register('activeIngredient')}
            placeholder="e.g. Oxytetracycline HCl"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Last Treatment Date</label>
            <input
              type="date"
              {...register('treatmentDate', { required: true })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Withdrawal Days *</label>
            <NumberInput name="withdrawalDays" register={register} placeholder="0" />
          </div>
        </div>
        {endDate && (
          <p className="text-xs text-amber-600 font-medium">
            ⚠️ Withdrawal ends: {endDate}
          </p>
        )}
      </div>

      {/* Affects */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Restricts:</p>
        <div className="flex gap-3">
          {(['affectsMeat', 'affectsEggs', 'affectsMilk'] as const).map((field, i) => (
            <label key={field} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" {...register(field)} className="w-4 h-4 rounded text-primary-600" />
              <span className="text-sm text-gray-700">{['Meat', 'Eggs', 'Milk'][i]}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
        <textarea
          {...register('notes')}
          rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>

      <SaveButton isSaving={isSaving} isSuccess={isSuccess} label="Save Withdrawal Record" />
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WithdrawalTrackerPage() {
  const { id: enterpriseId } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const orgId     = useAuthStore(s => s.appUser?.organizationId)
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab]           = useState<'active' | 'all'>('active')

  // If accessed from an enterprise context, show just that enterprise's records
  // Otherwise show org-wide active withdrawals
  const orgActive  = useOrgActiveWithdrawals(enterpriseId ? undefined : orgId)
  const entRecords = useWithdrawalRecords(enterpriseId)

  const today = new Date().toISOString().slice(0, 10)

  const displayActive = enterpriseId
    ? (entRecords ?? []).filter(r => r.withdrawalEndDate >= today)
    : (orgActive ?? [])

  const displayAll = enterpriseId
    ? (entRecords ?? [])
    : (orgActive ?? [])

  const records = tab === 'active' ? displayActive : displayAll

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <div className="bg-primary-600 px-4 pt-safe-top pb-0">
        <div className="flex items-center gap-3 mt-2 pb-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white -ml-2">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-white text-lg font-bold">Withdrawal Tracker</h1>
            <p className="text-white/70 text-xs">Medication withdrawal periods</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white active:scale-95"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-primary-500 -mx-4 px-4 gap-1">
          {(['active', 'all'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                tab === t ? 'text-white border-white' : 'text-white/60 border-transparent'
              }`}
            >
              {t === 'active' ? `Active (${displayActive.length})` : 'All Records'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3 pb-24">
        {records.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {tab === 'active' ? 'No active withdrawal periods' : 'No withdrawal records'}
            </p>
            <p className="text-xs mt-1">Tap + to add a withdrawal record</p>
          </div>
        ) : (
          records.map(r => <WithdrawalCard key={r.id} record={r} />)
        )}
      </div>

      {/* Add form bottom sheet */}
      {showForm && enterpriseId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Add Withdrawal Record</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
            </div>
            <AddWithdrawalForm enterpriseId={enterpriseId} onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
