import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useUIStore } from '../../stores/ui-store'
import { useCurrency } from '../../shared/hooks/useCurrency'
import { db } from '../../core/database/db'
import { newId, nowIso } from '../../shared/types/base'
import type { RecurringFrequency, FinancialCategory } from '../../shared/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES: { value: FinancialCategory; label: string }[] = [
  { value: 'feed',           label: '🌾 Feed'       },
  { value: 'labor',          label: '👷 Labor'      },
  { value: 'medication',     label: '💊 Medication' },
  { value: 'transport',      label: '🚛 Transport'  },
  { value: 'utilities',      label: '⚡ Utilities'  },
  { value: 'rent',           label: '🏠 Rent'       },
  { value: 'insurance',      label: '🛡️ Insurance' },
  { value: 'equipment',      label: '🔧 Equipment'  },
  { value: 'administrative', label: '📋 Admin'      },
  { value: 'other',          label: '📌 Other'      },
]

const INCOME_CATEGORIES: { value: FinancialCategory; label: string }[] = [
  { value: 'sales_eggs',  label: '🥚 Egg Sales'   },
  { value: 'sales_birds', label: '🐔 Bird Sales'  },
  { value: 'sales_milk',  label: '🥛 Milk Sales'  },
  { value: 'sales_fish',  label: '🐟 Fish Sales'  },
  { value: 'sales_crops', label: '🌾 Crop Sales'  },
  { value: 'sales_other', label: '💰 Other Sales' },
  { value: 'other',       label: '📌 Other'       },
]

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily',     label: 'Daily'     },
  { value: 'weekly',    label: 'Weekly'    },
  { value: 'monthly',   label: 'Monthly'   },
  { value: 'quarterly', label: 'Quarterly' },
]

// ── Form types ─────────────────────────────────────────────────────────────────

interface FormValues {
  type:                'expense' | 'income'
  category:            FinancialCategory
  description:         string
  amount:              string
  frequency:           RecurringFrequency
  startDate:           string
  endDate:             string   // empty = no end
  enterpriseId:        string
  notes:               string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecurringTransactionForm() {
  const navigate    = useNavigate()
  const { recurringId } = useParams<{ recurringId?: string }>()
  const isEdit      = Boolean(recurringId)
  const userId      = useAuthStore(s => s.user?.id)
  const addToast    = useUIStore(s => s.addToast)
  const { currency } = useCurrency()

  const existing = useLiveQuery(async () => {
    if (!recurringId) return null
    return db.recurringTransactions.get(recurringId) ?? null
  }, [recurringId])

  const orgId = useLiveQuery(async () => {
    if (!userId) return null
    const u = await db.appUsers.get(userId)
    return u?.organizationId ?? null
  }, [userId])

  const activeEnterprises = useLiveQuery(
    () => db.enterpriseInstances.where('status').equals('active').toArray(),
    [],
  ) ?? []

  const { register, handleSubmit, watch, control, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      defaultValues: {
        type:         'expense',
        category:     'feed',
        description:  '',
        amount:       '',
        frequency:    'monthly',
        startDate:    format(new Date(), 'yyyy-MM-dd'),
        endDate:      '',
        enterpriseId: '',
        notes:        '',
      },
    })

  const txnType = watch('type')

  // Populate form when editing
  useEffect(() => {
    if (existing) {
      reset({
        type:         existing.type,
        category:     existing.category as FinancialCategory,
        description:  existing.description,
        amount:       String(existing.amountCents / 100),
        frequency:    existing.frequency,
        startDate:    existing.startDate,
        endDate:      existing.endDate ?? '',
        enterpriseId: existing.enterpriseInstanceId ?? '',
        notes:        existing.notes ?? '',
      })
    }
  }, [existing, reset])

  const onSubmit = async (values: FormValues) => {
    if (!orgId) return
    const amountCents = Math.round(parseFloat(values.amount) * 100)
    if (isNaN(amountCents) || amountCents <= 0) return

    const now = nowIso()
    const record = {
      id:                    isEdit && recurringId ? recurringId : newId(),
      organizationId:        orgId,
      enterpriseInstanceId:  values.enterpriseId || undefined,
      type:                  values.type,
      category:              values.category,
      description:           values.description.trim(),
      amountCents,
      frequency:             values.frequency,
      startDate:             values.startDate,
      endDate:               values.endDate || undefined,
      nextDueDate:           isEdit && existing ? existing.nextDueDate : values.startDate,
      isActive:              true,
      notes:                 values.notes.trim() || undefined,
      syncStatus:            'pending' as const,
      createdAt:             isEdit && existing ? existing.createdAt : now,
      updatedAt:             now,
    }

    await db.recurringTransactions.put(record)
    addToast({ type: 'success', message: isEdit ? 'Updated recurring transaction' : 'Recurring transaction added' })
    navigate('/financials/recurring')
  }

  const handleDelete = async () => {
    if (!recurringId) return
    await db.recurringTransactions.delete(recurringId)
    addToast({ type: 'success', message: 'Recurring transaction removed' })
    navigate('/financials/recurring')
  }

  const categories = txnType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const inputClass = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="min-h-dvh bg-gray-50 pb-28 fade-in">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center text-gray-500 active:scale-95 transition-transform -ml-1"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">
          {isEdit ? 'Edit Recurring' : 'Add Recurring Transaction'}
        </h1>
        {isEdit && (
          <button
            onClick={handleDelete}
            className="w-8 h-8 flex items-center justify-center text-red-500 active:scale-95 transition-transform"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 pt-4 space-y-4">
        {/* Type toggle */}
        <div>
          <label className={labelClass}>Transaction Type</label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                {(['expense', 'income'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => field.onChange(t)}
                    className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                      field.value === t
                        ? t === 'expense'
                          ? 'bg-red-500 text-white'
                          : 'bg-emerald-500 text-white'
                        : 'bg-white text-gray-600'
                    }`}
                  >
                    {t === 'expense' ? '📤 Expense' : '📥 Income'}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        {/* Category */}
        <div>
          <label className={labelClass}>Category</label>
          <select {...register('category', { required: true })} className={inputClass}>
            {categories.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description *</label>
          <input
            {...register('description', { required: 'Description is required' })}
            placeholder="e.g. Monthly feed contract"
            className={inputClass}
          />
          {errors.description && (
            <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className={labelClass}>Amount ({currency}) *</label>
          <input
            {...register('amount', { required: true, min: 0.01 })}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className={inputClass}
          />
          {errors.amount && <p className="text-xs text-red-500 mt-1">Enter a valid amount</p>}
        </div>

        {/* Frequency */}
        <div>
          <label className={labelClass}>Frequency</label>
          <div className="grid grid-cols-2 gap-2">
            <Controller
              name="frequency"
              control={control}
              render={({ field }) => (
                <>
                  {FREQUENCIES.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => field.onChange(f.value)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                        field.value === f.value
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </>
              )}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Start Date *</label>
            <input
              {...register('startDate', { required: true })}
              type="date"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>End Date (optional)</label>
            <input
              {...register('endDate')}
              type="date"
              className={inputClass}
            />
          </div>
        </div>

        {/* Enterprise (optional) */}
        {activeEnterprises.length > 0 && (
          <div>
            <label className={labelClass}>Enterprise (optional)</label>
            <select {...register('enterpriseId')} className={inputClass}>
              <option value="">— Not enterprise-specific —</option>
              {activeEnterprises.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className={labelClass}>Notes (optional)</label>
          <input
            {...register('notes')}
            placeholder="Optional memo"
            className={inputClass}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary-600 text-white py-3 rounded-2xl font-semibold text-sm active:scale-98 transition-transform disabled:opacity-60"
        >
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Recurring Transaction'}
        </button>
      </form>
    </div>
  )
}
