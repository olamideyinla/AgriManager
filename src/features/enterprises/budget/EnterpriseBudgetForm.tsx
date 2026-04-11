import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { useAuthStore } from '../../../stores/auth-store'
import { useUIStore } from '../../../stores/ui-store'
import { db } from '../../../core/database/db'
import { NumberInput } from '../../../shared/components/entry/NumberInput'
import { SaveButton } from '../../../shared/components/entry/SaveButton'
import { useCurrency } from '../../../shared/hooks/useCurrency'
import type { EnterpriseBudget, BudgetPeriodType } from '../../../shared/types'

interface FormValues {
  periodType: BudgetPeriodType
  periodLabel: string
  revenueTarget: string
  totalCostBudget: string
  feedCostBudget: string
  laborCostBudget: string
  medicationBudget: string
  otherCostBudget: string
  notes: string
}

export default function EnterpriseBudgetForm() {
  const { id: enterpriseId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const orgId    = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const addToast = useUIStore(s => s.addToast)
  const { symbol } = useCurrency()
  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const enterprise = useLiveQuery(
    () => enterpriseId ? db.enterpriseInstances.get(enterpriseId) : undefined,
    [enterpriseId],
  )

  const existing = useLiveQuery(
    async () => {
      if (!enterpriseId) return undefined
      const budgets = await db.enterpriseBudgets
        .where('enterpriseInstanceId').equals(enterpriseId).toArray()
      return budgets[0] ?? null
    },
    [enterpriseId],
  )

  const { register, handleSubmit, watch, setValue, reset } = useForm<FormValues>({
    defaultValues: {
      periodType: 'batch',
      periodLabel: '',
      revenueTarget: '',
      totalCostBudget: '',
      feedCostBudget: '',
      laborCostBudget: '',
      medicationBudget: '',
      otherCostBudget: '',
      notes: '',
    },
  })

  // Pre-fill from existing budget when it loads
  const [prefilled, setPrefilled] = useState(false)
  if (existing && !prefilled) {
    setPrefilled(true)
    reset({
      periodType: existing.periodType,
      periodLabel: existing.periodLabel,
      revenueTarget: (existing.revenueTargetCents / 100).toFixed(2),
      totalCostBudget: (existing.totalCostBudgetCents / 100).toFixed(2),
      feedCostBudget: existing.feedCostBudgetCents != null ? (existing.feedCostBudgetCents / 100).toFixed(2) : '',
      laborCostBudget: existing.laborCostBudgetCents != null ? (existing.laborCostBudgetCents / 100).toFixed(2) : '',
      medicationBudget: existing.medicationBudgetCents != null ? (existing.medicationBudgetCents / 100).toFixed(2) : '',
      otherCostBudget: existing.otherCostBudgetCents != null ? (existing.otherCostBudgetCents / 100).toFixed(2) : '',
      notes: existing.notes ?? '',
    })
  }

  const onSubmit = async (values: FormValues) => {
    if (!enterpriseId) return
    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      const toCents = (v: string) => Math.round((parseFloat(v) || 0) * 100)
      const record: EnterpriseBudget = {
        id:                    existing?.id ?? nanoid(),
        enterpriseInstanceId:  enterpriseId,
        organizationId:        orgId,
        periodType:            values.periodType,
        periodLabel:           values.periodLabel || (values.periodType === 'batch' ? 'Batch Budget' : new Date().toISOString().slice(0, 7)),
        revenueTargetCents:    toCents(values.revenueTarget),
        totalCostBudgetCents:  toCents(values.totalCostBudget),
        feedCostBudgetCents:   values.feedCostBudget ? toCents(values.feedCostBudget) : undefined,
        laborCostBudgetCents:  values.laborCostBudget ? toCents(values.laborCostBudget) : undefined,
        medicationBudgetCents: values.medicationBudget ? toCents(values.medicationBudget) : undefined,
        otherCostBudgetCents:  values.otherCostBudget ? toCents(values.otherCostBudget) : undefined,
        notes:                 values.notes || undefined,
        syncStatus:            'pending',
        createdAt:             existing?.createdAt ?? now,
        updatedAt:             now,
      }
      await db.enterpriseBudgets.put(record)
      setIsSuccess(true)
      addToast({ message: 'Budget saved', type: 'success' })
      setTimeout(() => navigate(-1), 900)
    } catch {
      addToast({ message: 'Failed to save — try again', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const periodType = watch('periodType')

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
          <p className="text-white font-semibold text-lg leading-tight">
            {existing ? 'Edit Budget' : 'Set Budget'}
          </p>
          <p className="text-white/60 text-xs">{enterprise?.name ?? 'Enterprise budget & targets'}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pb-8">

          {/* Period type */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Budget Period</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period type</label>
              <div className="flex gap-2">
                {(['batch', 'monthly'] as BudgetPeriodType[]).map(pt => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setValue('periodType', pt)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      periodType === pt
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    {pt.charAt(0).toUpperCase() + pt.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period label</label>
              <input
                {...register('periodLabel')}
                placeholder={periodType === 'batch' ? 'e.g. Batch Jan-2025' : 'e.g. 2025-04'}
                className="input-base"
              />
            </div>
          </div>

          {/* Targets */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Targets</h3>
            <NumberInput
              label="Revenue target"
              unit={symbol}
              isDecimal
              value={watch('revenueTarget')}
              onChange={v => setValue('revenueTarget', v)}
              min="0"
            />
            <NumberInput
              label="Total cost budget"
              unit={symbol}
              isDecimal
              value={watch('totalCostBudget')}
              onChange={v => setValue('totalCostBudget', v)}
              min="0"
            />
          </div>

          {/* Optional cost breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <button
              type="button"
              onClick={() => setShowBreakdown(v => !v)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-700"
            >
              Cost Breakdown (optional)
              {showBreakdown ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {showBreakdown && (
              <div className="space-y-3 pt-1">
                <NumberInput
                  label="Feed budget"
                  unit={symbol}
                  isDecimal
                  value={watch('feedCostBudget')}
                  onChange={v => setValue('feedCostBudget', v)}
                  min="0"
                />
                <NumberInput
                  label="Labour budget"
                  unit={symbol}
                  isDecimal
                  value={watch('laborCostBudget')}
                  onChange={v => setValue('laborCostBudget', v)}
                  min="0"
                />
                <NumberInput
                  label="Medication budget"
                  unit={symbol}
                  isDecimal
                  value={watch('medicationBudget')}
                  onChange={v => setValue('medicationBudget', v)}
                  min="0"
                />
                <NumberInput
                  label="Other costs budget"
                  unit={symbol}
                  isDecimal
                  value={watch('otherCostBudget')}
                  onChange={v => setValue('otherCostBudget', v)}
                  min="0"
                />
              </div>
            )}
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
