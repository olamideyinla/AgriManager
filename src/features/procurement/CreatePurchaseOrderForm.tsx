import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { format } from 'date-fns'
import { useAuthStore } from '../../stores/auth-store'
import { useUIStore } from '../../stores/ui-store'
import { db } from '../../core/database/db'
import { SaveButton } from '../../shared/components/entry/SaveButton'
import type { PurchaseOrder, PurchaseOrderItem } from '../../shared/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LineItem {
  inventoryItemId: string
  orderedQuantity: string
  unitCostCents: string  // displayed as decimal dollars
  notes: string
}

interface FormValues {
  supplierId: string
  orderDate: string
  expectedDeliveryDate: string
  notes: string
  lineItems: LineItem[]
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CreatePurchaseOrderForm() {
  const navigate = useNavigate()
  const { id: poId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const prefillItemId = searchParams.get('itemId') ?? ''
  const isEdit = !!poId
  const orgId = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const userId = useAuthStore(s => s.user?.id) ?? ''
  const addToast = useUIStore(s => s.addToast)

  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Load existing PO in edit mode
  const existingPO = useLiveQuery(
    () => isEdit && poId ? db.purchaseOrders.get(poId) : undefined,
    [poId, isEdit],
  )
  const existingItems = useLiveQuery(
    () => isEdit && poId
      ? db.purchaseOrderItems.where('purchaseOrderId').equals(poId).toArray()
      : undefined,
    [poId, isEdit],
  )

  // Load suppliers and inventory items
  const suppliers = useLiveQuery(async () => {
    if (!orgId) return []
    return db.contacts.where('organizationId').equals(orgId).filter(c => c.type === 'supplier').toArray()
  }, [orgId]) ?? []

  const inventoryItems = useLiveQuery(async () => {
    if (!orgId) return []
    return db.inventoryItems.where('organizationId').equals(orgId).sortBy('name')
  }, [orgId]) ?? []

  const today = format(new Date(), 'yyyy-MM-dd')

  const { register, control, handleSubmit, watch, reset } = useForm<FormValues>({
    defaultValues: {
      supplierId: '',
      orderDate: today,
      expectedDeliveryDate: '',
      notes: '',
      lineItems: prefillItemId
        ? [{ inventoryItemId: prefillItemId, orderedQuantity: '', unitCostCents: '', notes: '' }]
        : [{ inventoryItemId: '', orderedQuantity: '', unitCostCents: '', notes: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' })

  // Pre-fill form from existing PO
  const [prefilled, setPrefilled] = useState(false)
  useEffect(() => {
    if (isEdit && existingPO && existingItems !== undefined && !prefilled) {
      setPrefilled(true)
      reset({
        supplierId: existingPO.supplierId ?? '',
        orderDate: existingPO.orderDate,
        expectedDeliveryDate: existingPO.expectedDeliveryDate ?? '',
        notes: existingPO.notes ?? '',
        lineItems: existingItems.map(i => ({
          inventoryItemId: i.inventoryItemId,
          orderedQuantity: String(i.orderedQuantity),
          unitCostCents: (i.unitCostCents / 100).toFixed(2),
          notes: i.notes ?? '',
        })),
      })
    }
  }, [isEdit, existingPO, existingItems, prefilled, reset])

  const lineItems = watch('lineItems')

  const totalCents = lineItems.reduce((sum, li) => {
    const qty  = parseFloat(li.orderedQuantity) || 0
    const cost = Math.round((parseFloat(li.unitCostCents) || 0) * 100)
    return sum + qty * cost
  }, 0)

  const onSubmit = async (values: FormValues) => {
    if (!orgId) return
    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      const poIdFinal = isEdit ? poId! : nanoid()

      const po: PurchaseOrder = {
        id:                   poIdFinal,
        organizationId:       orgId,
        supplierId:           values.supplierId || undefined,
        status:               existingPO?.status ?? 'draft',
        orderDate:            values.orderDate,
        expectedDeliveryDate: values.expectedDeliveryDate || undefined,
        actualDeliveryDate:   existingPO?.actualDeliveryDate,
        notes:                values.notes || undefined,
        totalAmountCents:     totalCents,
        syncStatus:           'pending',
        createdAt:            existingPO?.createdAt ?? now,
        updatedAt:            now,
      }

      const items: PurchaseOrderItem[] = values.lineItems
        .filter(li => li.inventoryItemId && li.orderedQuantity)
        .map(li => ({
          id:               existingItems?.find(e => e.inventoryItemId === li.inventoryItemId)?.id ?? nanoid(),
          purchaseOrderId:  poIdFinal,
          inventoryItemId:  li.inventoryItemId,
          orderedQuantity:  parseFloat(li.orderedQuantity) || 0,
          receivedQuantity: existingItems?.find(e => e.inventoryItemId === li.inventoryItemId)?.receivedQuantity ?? 0,
          unitCostCents:    Math.round((parseFloat(li.unitCostCents) || 0) * 100),
          notes:            li.notes || undefined,
          syncStatus:       'pending',
          createdAt:        now,
          updatedAt:        now,
        }))

      await db.purchaseOrders.put(po)

      if (isEdit) {
        // Delete old items and re-insert
        await db.purchaseOrderItems.where('purchaseOrderId').equals(poIdFinal).delete()
      }
      await db.purchaseOrderItems.bulkPut(items)

      setIsSuccess(true)
      addToast({ message: isEdit ? 'PO updated' : 'Purchase order created', type: 'success' })
      setTimeout(() => {
        if (isEdit) navigate(`/procurement/orders/${poIdFinal}`)
        else navigate('/procurement/orders')
      }, 900)
    } catch {
      addToast({ message: 'Failed to save — try again', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-primary-600 px-4 pt-3 pb-4 safe-top flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white active:scale-95"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <p className="text-white font-semibold text-lg leading-tight">
            {isEdit ? 'Edit Purchase Order' : 'New Purchase Order'}
          </p>
          <p className="text-white/60 text-xs">Order from supplier</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pb-8">

          {/* PO details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Order Details</h3>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
              <select {...register('supplierId')} className="input-base">
                <option value="">— No supplier —</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Order Date *</label>
              <input type="date" {...register('orderDate', { required: true })} className="input-base" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expected Delivery</label>
              <input type="date" {...register('expectedDeliveryDate')} className="input-base" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea {...register('notes')} rows={2} placeholder="Any notes…" className="input-base resize-none" />
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>

            {fields.map((field, idx) => (
              <div key={field.id} className="rounded-xl border border-gray-100 p-3 space-y-2 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Item {idx + 1}</span>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="w-9 h-9 flex items-center justify-center text-red-400 active:scale-95 transition-transform rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Inventory Item *</label>
                  <select {...register(`lineItems.${idx}.inventoryItemId`, { required: true })} className="input-base">
                    <option value="">— Select item —</option>
                    {inventoryItems.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.unitOfMeasurement})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Qty *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      {...register(`lineItems.${idx}.orderedQuantity`, { required: true })}
                      className="input-base"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unit Cost *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register(`lineItems.${idx}.unitCostCents`, { required: true })}
                      className="input-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    {...register(`lineItems.${idx}.notes`)}
                    className="input-base"
                  />
                </div>

                {/* Line total */}
                {lineItems[idx]?.orderedQuantity && lineItems[idx]?.unitCostCents && (
                  <p className="text-xs text-right text-gray-500">
                    Line total:{' '}
                    <span className="font-semibold text-gray-700">
                      ${((parseFloat(lineItems[idx].orderedQuantity) || 0) * (parseFloat(lineItems[idx].unitCostCents) || 0)).toFixed(2)}
                    </span>
                  </p>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => append({ inventoryItemId: '', orderedQuantity: '', unitCostCents: '', notes: '' })}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 active:bg-gray-50 transition-colors"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          {/* Total */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Order Total</span>
            <span className="text-lg font-bold text-primary-700">${(totalCents / 100).toFixed(2)}</span>
          </div>

          <SaveButton isLoading={isSaving} isSuccess={isSuccess} />
        </form>
      </div>
    </div>
  )
}
