import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { format } from 'date-fns'
import { useAuthStore } from '../../stores/auth-store'
import { useUIStore } from '../../stores/ui-store'
import { useCurrency } from '../../shared/hooks/useCurrency'
import { db } from '../../core/database/db'
import { SaveButton } from '../../shared/components/entry/SaveButton'
import type { PurchaseOrder, PurchaseOrderItem } from '../../shared/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function generatePoNumber(): string {
  const date = format(new Date(), 'yyyyMMdd')
  const suffix = nanoid(4).toUpperCase().replace(/[^A-Z0-9]/g, 'X')
  return `PO-${date}-${suffix}`
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LineItem {
  inventoryItemId: string   // '' when not linked to existing item
  itemName: string          // free text — always required
  unitOfMeasurement: string
  orderedQuantity: string
  unitCostCents: string     // displayed as decimal
  notes: string
}

interface FormValues {
  poNumber: string
  supplierName: string
  supplierId: string        // hidden, set when supplier selected from autocomplete
  orderDate: string
  expectedDeliveryDate: string
  notes: string
  lineItems: LineItem[]
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CreatePurchaseOrderForm() {
  const navigate       = useNavigate()
  const { id: poId }  = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const prefillItemId  = searchParams.get('itemId') ?? ''
  const isEdit         = !!poId
  const orgId          = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const addToast       = useUIStore(s => s.addToast)
  const { symbol }     = useCurrency()

  const [isSaving, setIsSaving]   = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Autocomplete state
  const [showSupplierSugg, setShowSupplierSugg] = useState(false)
  const [activeItemIdx, setActiveItemIdx]       = useState<number | null>(null)

  // ── Data ─────────────────────────────────────────────────────────────────

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
  const suppliers = useLiveQuery(async () => {
    if (!orgId) return []
    return db.contacts.where('organizationId').equals(orgId).filter(c => c.type === 'supplier').toArray()
  }, [orgId]) ?? []

  const inventoryItems = useLiveQuery(async () => {
    if (!orgId) return []
    return db.inventoryItems.where('organizationId').equals(orgId).sortBy('name')
  }, [orgId]) ?? []

  const prefillItem = useLiveQuery(
    () => prefillItemId ? db.inventoryItems.get(prefillItemId) : undefined,
    [prefillItemId],
  )

  // ── Form ──────────────────────────────────────────────────────────────────

  const today = format(new Date(), 'yyyy-MM-dd')

  const { register, control, handleSubmit, watch, reset, setValue } = useForm<FormValues>({
    defaultValues: {
      poNumber:             generatePoNumber(),
      supplierName:         '',
      supplierId:           '',
      orderDate:            today,
      expectedDeliveryDate: '',
      notes:                '',
      lineItems: [{
        inventoryItemId: prefillItemId,
        itemName:        '',
        unitOfMeasurement: '',
        orderedQuantity: '',
        unitCostCents:   '',
        notes:           '',
      }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' })

  // Update first line item when prefill item loads
  useEffect(() => {
    if (prefillItem) {
      setValue('lineItems.0.itemName', prefillItem.name)
      setValue('lineItems.0.inventoryItemId', prefillItem.id)
      setValue('lineItems.0.unitOfMeasurement', prefillItem.unitOfMeasurement)
    }
  }, [prefillItem, setValue])

  // Pre-fill from existing PO (edit mode)
  const [prefilled, setPrefilled] = useState(false)
  useEffect(() => {
    if (isEdit && existingPO && existingItems !== undefined && !prefilled) {
      setPrefilled(true)
      reset({
        poNumber:             existingPO.poNumber ?? generatePoNumber(),
        supplierName:         existingPO.supplierName ?? '',
        supplierId:           existingPO.supplierId ?? '',
        orderDate:            existingPO.orderDate,
        expectedDeliveryDate: existingPO.expectedDeliveryDate ?? '',
        notes:                existingPO.notes ?? '',
        lineItems: existingItems.length > 0
          ? existingItems.map(i => ({
              inventoryItemId:  i.inventoryItemId ?? '',
              itemName:         i.itemName,
              unitOfMeasurement: i.unitOfMeasurement ?? '',
              orderedQuantity:  String(i.orderedQuantity),
              unitCostCents:    (i.unitCostCents / 100).toFixed(2),
              notes:            i.notes ?? '',
            }))
          : [{ inventoryItemId: '', itemName: '', unitOfMeasurement: '', orderedQuantity: '', unitCostCents: '', notes: '' }],
      })
    }
  }, [isEdit, existingPO, existingItems, prefilled, reset])

  const lineItems    = watch('lineItems')
  const supplierName = watch('supplierName')

  const totalCents = lineItems.reduce((sum, li) => {
    const qty  = parseFloat(li.orderedQuantity) || 0
    const cost = Math.round((parseFloat(li.unitCostCents) || 0) * 100)
    return sum + qty * cost
  }, 0)

  const filteredSuppliers = suppliers.filter(s =>
    !supplierName || s.name.toLowerCase().includes(supplierName.toLowerCase())
  )

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (values: FormValues) => {
    if (!orgId) return
    setIsSaving(true)
    try {
      const now        = new Date().toISOString()
      const poIdFinal  = isEdit ? poId! : nanoid()

      const po: PurchaseOrder = {
        id:                   poIdFinal,
        organizationId:       orgId,
        poNumber:             values.poNumber,
        supplierId:           values.supplierId || undefined,
        supplierName:         values.supplierName || undefined,
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
        .filter(li => li.itemName.trim() && li.orderedQuantity)
        .map(li => {
          const prev = existingItems?.find(e =>
            li.inventoryItemId ? e.inventoryItemId === li.inventoryItemId : e.itemName === li.itemName
          )
          return {
            id:               prev?.id ?? nanoid(),
            purchaseOrderId:  poIdFinal,
            inventoryItemId:  li.inventoryItemId || undefined,
            itemName:         li.itemName.trim(),
            unitOfMeasurement: li.unitOfMeasurement || undefined,
            orderedQuantity:  parseFloat(li.orderedQuantity) || 0,
            receivedQuantity: prev?.receivedQuantity ?? 0,
            unitCostCents:    Math.round((parseFloat(li.unitCostCents) || 0) * 100),
            notes:            li.notes || undefined,
            syncStatus:       'pending',
            createdAt:        prev?.createdAt ?? now,
            updatedAt:        now,
          }
        })

      await db.purchaseOrders.put(po)
      if (isEdit) {
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

  // ── Render ────────────────────────────────────────────────────────────────

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

          {/* Order Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Order Details</h3>

            {/* PO Number */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">PO Number *</label>
              <input
                type="text"
                {...register('poNumber', { required: true })}
                className="input-base font-mono tracking-wide"
                placeholder="PO-20240415-A3B2"
              />
            </div>

            {/* Supplier — text with autocomplete */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-600 mb-1">Supplier (optional)</label>
              <input
                type="text"
                {...register('supplierName')}
                onFocus={() => setShowSupplierSugg(true)}
                onBlur={() => setTimeout(() => setShowSupplierSugg(false), 150)}
                placeholder="Type or search supplier name…"
                autoComplete="off"
                className="input-base"
              />
              {/* Hidden linked supplierId */}
              <input type="hidden" {...register('supplierId')} />
              {showSupplierSugg && filteredSuppliers.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-44 overflow-y-auto mt-1">
                  {filteredSuppliers.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={() => {
                        setValue('supplierName', s.name)
                        setValue('supplierId', s.id)
                        setShowSupplierSugg(false)
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      <p className="font-medium">{s.name}</p>
                      {s.phone && <p className="text-xs text-gray-400 mt-0.5">{s.phone}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Order Date *</label>
                <input type="date" {...register('orderDate', { required: true })} className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Expected Delivery</label>
                <input type="date" {...register('expectedDeliveryDate')} className="input-base" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea {...register('notes')} rows={2} placeholder="Any notes…" className="input-base resize-none" />
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Items Ordered</h3>

            {fields.map((field, idx) => {
              const li = lineItems[idx]
              const filteredInvItems = inventoryItems.filter(i =>
                !li?.itemName || i.name.toLowerCase().includes(li.itemName.toLowerCase())
              )
              const lineTotal = (parseFloat(li?.orderedQuantity) || 0) * (parseFloat(li?.unitCostCents) || 0)

              return (
                <div key={field.id} className="rounded-xl border border-gray-100 p-3 space-y-2.5 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Item {idx + 1}</span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="w-9 h-9 flex items-center justify-center text-red-400 active:scale-95 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Item name with inventory autocomplete */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Item Name *</label>
                    <input
                      type="text"
                      {...register(`lineItems.${idx}.itemName`, { required: true })}
                      onFocus={() => setActiveItemIdx(idx)}
                      onBlur={() => setTimeout(() => setActiveItemIdx(null), 150)}
                      placeholder="Search inventory or type new item…"
                      autoComplete="off"
                      className="input-base"
                    />
                    {/* Hidden linked fields */}
                    <input type="hidden" {...register(`lineItems.${idx}.inventoryItemId`)} />
                    <input type="hidden" {...register(`lineItems.${idx}.unitOfMeasurement`)} />

                    {activeItemIdx === idx && filteredInvItems.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-44 overflow-y-auto mt-1">
                        {filteredInvItems.map(i => (
                          <button
                            key={i.id}
                            type="button"
                            onMouseDown={() => {
                              setValue(`lineItems.${idx}.itemName`, i.name)
                              setValue(`lineItems.${idx}.inventoryItemId`, i.id)
                              setValue(`lineItems.${idx}.unitOfMeasurement`, i.unitOfMeasurement)
                              setActiveItemIdx(null)
                            }}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                          >
                            <p className="font-medium text-gray-800">{i.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {i.unitOfMeasurement} · Stock: {i.currentStock}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Qty + Unit Cost */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Qty{li?.unitOfMeasurement ? ` (${li.unitOfMeasurement})` : ''}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        {...register(`lineItems.${idx}.orderedQuantity`, { required: true })}
                        className="input-base"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Unit Cost ({symbol})
                      </label>
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

                  {lineTotal > 0 && (
                    <p className="text-xs text-right text-gray-400">
                      Line total:{' '}
                      <span className="font-semibold text-gray-700">
                        {symbol}{lineTotal.toFixed(2)}
                      </span>
                    </p>
                  )}
                </div>
              )
            })}

            <button
              type="button"
              onClick={() => append({ inventoryItemId: '', itemName: '', unitOfMeasurement: '', orderedQuantity: '', unitCostCents: '', notes: '' })}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 active:bg-gray-50 transition-colors"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          {/* Order Total */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Order Total</span>
            <span className="text-xl font-bold text-primary-700">
              {symbol}{(totalCents / 100).toFixed(2)}
            </span>
          </div>

          <SaveButton isSaving={isSaving} isSuccess={isSuccess} />
        </form>
      </div>
    </div>
  )
}
