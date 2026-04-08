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
import type { LitterConditionLog } from '../../../shared/types'

interface FormValues {
  date: string
  condition: 'good' | 'wet' | 'dry' | 'caked'
  ammoniaLevel: '' | 'low' | 'medium' | 'high'
  action: 'none' | 'turned' | 'replaced' | 'material_added'
  materialAdded: string
  materialAmountKg: string
  notes: string
}

export default function LitterConditionForm() {
  const { id: enterpriseId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = useAuthStore(s => s.user?.id) ?? ''
  const orgId  = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const addToast = useUIStore(s => s.addToast)
  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      date: today,
      condition: 'good',
      ammoniaLevel: '',
      action: 'none',
      materialAdded: '',
      materialAmountKg: '',
      notes: '',
    },
  })

  const action = watch('action')

  const onSubmit = async (values: FormValues) => {
    if (!enterpriseId) return
    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      const record: LitterConditionLog = {
        id:                   nanoid(),
        enterpriseInstanceId: enterpriseId,
        organizationId:       orgId,
        date:                 values.date,
        condition:            values.condition,
        ammoniaLevel:         values.ammoniaLevel || undefined,
        action:               values.action,
        materialAdded:        values.action === 'material_added' ? values.materialAdded || undefined : undefined,
        materialAmountKg:     values.action === 'material_added' ? parseFloat(values.materialAmountKg) || undefined : undefined,
        notes:                values.notes || undefined,
        syncStatus:           'pending',
        createdAt:            now,
        updatedAt:            now,
      }
      await db.litterConditionLogs.put(record)
      setIsSuccess(true)
      addToast({ message: 'Litter condition logged', type: 'success' })
      setTimeout(() => navigate(-1), 900)
    } catch {
      addToast({ message: 'Failed to save — try again', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const CONDITION_LABELS = { good: 'Good', wet: 'Wet', dry: 'Dry', caked: 'Caked' }
  const AMMONIA_LABELS   = { '': 'Not tested', low: 'Low', medium: 'Medium', high: 'High' }
  const ACTION_LABELS    = { none: 'None', turned: 'Turned', replaced: 'Replaced', material_added: 'Material added' }

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
          <p className="text-white font-semibold text-lg leading-tight">Litter Condition Log</p>
          <p className="text-white/60 text-xs">Bedding & litter management</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pb-8">

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Condition</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" {...register('date')} className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Litter condition</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(CONDITION_LABELS) as Array<keyof typeof CONDITION_LABELS>).map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setValue('condition', k)}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      watch('condition') === k
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    {CONDITION_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ammonia level</label>
              <select {...register('ammoniaLevel')} className="input-base">
                {(Object.keys(AMMONIA_LABELS) as Array<keyof typeof AMMONIA_LABELS>).map(k => (
                  <option key={k} value={k}>{AMMONIA_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Action Taken</h3>
            <div>
              <select {...register('action')} className="input-base">
                {(Object.keys(ACTION_LABELS) as Array<keyof typeof ACTION_LABELS>).map(k => (
                  <option key={k} value={k}>{ACTION_LABELS[k]}</option>
                ))}
              </select>
            </div>
            {action === 'material_added' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material added</label>
                  <input {...register('materialAdded')} placeholder="e.g. Wood shavings, Rice husks" className="input-base" />
                </div>
                <NumberInput
                  label="Amount"
                  unit="kg"
                  isDecimal
                  value={watch('materialAmountKg')}
                  onChange={(v) => setValue('materialAmountKg', v)}
                  min="0"
                />
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Any observations…"
              className="input-base resize-none"
            />
          </div>

          <SaveButton isLoading={isSaving} isSuccess={isSuccess} />
        </form>
      </div>
    </div>
  )
}
