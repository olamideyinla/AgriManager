import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { ArrowLeft, Plus, Trash2, Loader2, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useCurrency } from '../../shared/hooks/useCurrency'
import { db } from '../../core/database/db'
import { newId, nowIso } from '../../shared/types/base'
import {
  calculateDocumentTotals,
  calculateChangeDue,
  lineItemTotal,
} from './services/document-calculator'
import { getNextReceiptNumber, getOrCreateInvoiceSettings } from './services/document-numbers'
import type { Receipt, ReceiptItem, FinancialTransaction, PaymentMethod } from '../../shared/types'

// ── Schema ────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity:    z.coerce.number().positive(),
  unit:        z.string().min(1),
  unitPrice:   z.coerce.number().min(0),
})

const schema = z.object({
  buyerName:       z.string().min(1, 'Buyer name required'),
  buyerPhone:      z.string().optional(),
  date:            z.string(),
  type:            z.enum(['sale', 'payment_received', 'deposit']),
  paymentMethod:   z.enum(['cash', 'bank', 'mobile_money', 'cheque', 'other']),
  paymentReference:z.string().optional(),
  amountReceived:  z.coerce.number().min(0),
  taxEnabled:      z.boolean(),
  taxRate:         z.coerce.number().min(0).max(100).optional(),
  discount:        z.coerce.number().min(0).optional(),
  discountType:    z.enum(['flat', 'percentage']).optional(),
  notes:           z.string().optional(),
  linkedInvoiceId: z.string().optional(),
  enterpriseInstanceId: z.string().optional(),
  items:           z.array(itemSchema).min(1, 'Add at least one item'),
})

type FormValues = z.infer<typeof schema>

const PAYMENT_METHODS = [
  { value: 'cash',         label: 'Cash'         },
  { value: 'bank',         label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money'  },
  { value: 'cheque',       label: 'Cheque'        },
  { value: 'other',        label: 'Other'         },
]

const RECEIPT_TYPES = [
  { value: 'sale',              label: 'Sale'             },
  { value: 'payment_received',  label: 'Payment Received' },
  { value: 'deposit',           label: 'Deposit'          },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreateReceiptPage() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const appUser        = useAuthStore(s => s.appUser)
  const { fmt }        = useCurrency()
  const [saving, setSaving] = useState(false)

  const prefillInvoiceId = searchParams.get('invoiceId')

  const settings = useLiveQuery(async () => {
    if (!appUser?.organizationId) return null
    return getOrCreateInvoiceSettings(appUser.organizationId)
  }, [appUser?.organizationId])

  const contacts = useLiveQuery(async () => {
    if (!appUser?.organizationId) return []
    return db.contacts.where('organizationId').equals(appUser.organizationId).toArray()
  }, [appUser?.organizationId], [])

  // Prefill from linked invoice
  const linkedInvoice = useLiveQuery(async () => {
    if (!prefillInvoiceId) return null
    return db.invoices.get(prefillInvoiceId) ?? null
  }, [prefillInvoiceId])

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date:           format(new Date(), 'yyyy-MM-dd'),
      type:           prefillInvoiceId ? 'payment_received' : 'sale',
      paymentMethod:  'cash',
      amountReceived: 0,
      taxEnabled:     false,
      discountType:   'flat',
      linkedInvoiceId: prefillInvoiceId ?? undefined,
      items:          [{ description: '', quantity: 1, unit: 'pcs', unitPrice: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems   = watch('items')
  const watchedTax     = watch('taxEnabled')
  const watchedTaxRate = watch('taxRate')
  const watchedDisc    = watch('discount')
  const watchedDiscType= watch('discountType')
  const amountReceived = watch('amountReceived')

  const totals = calculateDocumentTotals(
    watchedItems ?? [],
    watchedTaxRate ?? null,
    watchedTax,
    watchedDisc ?? null,
    watchedDiscType ?? null,
  )
  const changeDue = calculateChangeDue(totals.totalAmount, amountReceived ?? 0)

  const onSubmit = useCallback(async (values: FormValues) => {
    if (!appUser?.organizationId) return
    setSaving(true)
    try {
      const ts            = nowIso()
      const receiptNumber = await getNextReceiptNumber(appUser.organizationId)
      const receiptId     = newId()
      const currency      = (await db.organizations.get(appUser.organizationId))?.currency ?? 'USD'

      const itemRows: ReceiptItem[] = values.items.map(item => ({
        id:          newId(),
        receiptId,
        description: item.description,
        quantity:    item.quantity,
        unit:        item.unit,
        unitPrice:   item.unitPrice,
        total:       lineItemTotal(item.quantity, item.unitPrice),
        createdAt:   ts,
        updatedAt:   ts,
        syncStatus:  'pending',
      }))

      // Map receipt payment method to FinancialTransaction paymentMethod
      const financialPaymentMethod: PaymentMethod =
        (['cash', 'bank', 'mobile_money'] as const).includes(values.paymentMethod as PaymentMethod)
          ? (values.paymentMethod as PaymentMethod)
          : 'bank'

      // Create matching FinancialTransaction (income)
      const ftxnId = newId()
      const ftxn: FinancialTransaction = {
        id:              ftxnId,
        organizationId:  appUser.organizationId,
        enterpriseInstanceId: values.enterpriseInstanceId ?? undefined,
        date:            values.date,
        type:            'income',
        category:        'sales_other',
        amount:          totals.totalAmount,
        paymentMethod:   financialPaymentMethod,
        reference:       receiptNumber,
        notes:           `Receipt — ${values.buyerName}`,
        createdAt:       ts,
        updatedAt:       ts,
        syncStatus:      'pending',
      }

      const receipt: Receipt = {
        id:                          receiptId,
        organizationId:              appUser.organizationId,
        receiptNumber,
        type:                        values.type,
        status:                      'issued',
        buyerId:                     null,
        buyerName:                   values.buyerName,
        buyerPhone:                  values.buyerPhone ?? null,
        date:                        values.date,
        subtotal:                    totals.subtotal,
        taxRate:                     values.taxEnabled ? (values.taxRate ?? null) : null,
        taxLabel:                    settings?.taxLabel ?? 'Tax',
        taxAmount:                   totals.taxAmount > 0 ? totals.taxAmount : null,
        discount:                    values.discount ?? null,
        discountType:                values.discountType ?? null,
        discountAmount:              totals.discountAmount > 0 ? totals.discountAmount : null,
        totalAmount:                 totals.totalAmount,
        amountReceived:              values.amountReceived,
        changeDue,
        paymentMethod:               values.paymentMethod,
        paymentReference:            values.paymentReference ?? null,
        linkedInvoiceId:             values.linkedInvoiceId ?? null,
        linkedFinancialTransactionId:ftxnId,
        enterpriseInstanceId:        values.enterpriseInstanceId ?? null,
        currency,
        notes:                       values.notes ?? null,
        createdAt:                   ts,
        updatedAt:                   ts,
        syncStatus:                  'pending',
      }

      await db.transaction('rw', [db.receipts, db.receiptItems, db.financialTransactions], async () => {
        await db.financialTransactions.add(ftxn)
        await db.receipts.add(receipt)
        await db.receiptItems.bulkAdd(itemRows)
      })

      navigate(`/invoicing/receipt/${receiptId}`, { replace: true })
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }, [appUser, settings, totals, changeDue, navigate])

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col safe-top safe-bottom">
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="touch-target text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">New Receipt</h1>
        <button
          form="receipt-form"
          type="submit"
          disabled={saving}
          className="bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : 'Issue'}
        </button>
      </div>

      <form id="receipt-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">

          {/* Recipient */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Received From</h2>
            {contacts && contacts.length > 0 && (
              <div className="mb-2">
                <label className="label-sm">Choose from contacts</label>
                <div className="relative">
                  <select
                    className="input-base appearance-none pr-8"
                    onChange={e => {
                      const c = contacts.find(x => x.id === e.target.value)
                      if (c) {
                        setValue('buyerName', c.name)
                        setValue('buyerPhone', c.phone ?? '')
                      }
                    }}
                  >
                    <option value="">— select contact —</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
            {errors.buyerName && <p className="text-xs text-red-500 mb-1">{errors.buyerName.message}</p>}
            <label className="label-sm">Name *</label>
            <input {...register('buyerName')} className="input-base" placeholder="e.g. John Smith" />
            <label className="label-sm mt-2">Phone</label>
            <input {...register('buyerPhone')} type="tel" className="input-base" />
          </div>

          {/* Type & Date */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-sm">Receipt Type</label>
                <div className="relative">
                  <select {...register('type')} className="input-base appearance-none pr-6">
                    {RECEIPT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="label-sm">Date</label>
                <input {...register('date')} type="date" className="input-base" />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Items</h2>
            {fields.map((field, index) => (
              <div key={field.id} className="bg-gray-50 rounded-xl p-3 mb-3">
                <label className="label-sm">Description</label>
                <input {...register(`items.${index}.description`)} className="input-base" placeholder="Item or service" />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <label className="label-sm">Qty</label>
                    <input {...register(`items.${index}.quantity`)} type="number" inputMode="decimal" className="input-base text-center" step="any" />
                  </div>
                  <div>
                    <label className="label-sm">Unit</label>
                    <input {...register(`items.${index}.unit`)} className="input-base text-center" placeholder="pcs" />
                  </div>
                  <div>
                    <label className="label-sm">Price</label>
                    <input {...register(`items.${index}.unitPrice`)} type="number" inputMode="decimal" className="input-base text-right" step="any" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {fmt(lineItemTotal(watchedItems?.[index]?.quantity ?? 0, watchedItems?.[index]?.unitPrice ?? 0))}
                  </span>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="text-red-400">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => append({ description: '', quantity: 1, unit: 'pcs', unitPrice: 0 })}
              className="flex items-center gap-1.5 text-primary-600 text-sm font-medium w-full justify-center py-2 border-2 border-dashed border-primary-200 rounded-xl"
            >
              <Plus size={15} /> Add Item
            </button>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Payment</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-sm">Method</label>
                <div className="relative">
                  <select {...register('paymentMethod')} className="input-base appearance-none pr-6">
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="label-sm">Reference</label>
                <input {...register('paymentReference')} className="input-base" placeholder="e.g. Mpesa ref" />
              </div>
            </div>
            <div className="mt-3">
              <label className="label-sm">Amount Received</label>
              <input {...register('amountReceived')} type="number" inputMode="decimal" className="input-base text-right text-lg font-semibold" step="any" />
            </div>
            {changeDue > 0 && (
              <p className="text-sm text-emerald-600 font-medium mt-2">Change due: {fmt(changeDue)}</p>
            )}
          </div>

          {/* Tax & Discount */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Tax & Discount</h2>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-gray-700">Enable Tax</label>
              <Controller
                control={control}
                name="taxEnabled"
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`w-11 h-6 rounded-full transition-colors ${field.value ? 'bg-primary-600' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-transform ${field.value ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                )}
              />
            </div>
            {watchedTax && (
              <div className="mb-3">
                <label className="label-sm">Tax Rate (%)</label>
                <input {...register('taxRate')} type="number" inputMode="decimal" className="input-base" placeholder="16" step="0.1" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label-sm">Discount</label>
                <input {...register('discount')} type="number" inputMode="decimal" className="input-base" placeholder="0" step="any" />
              </div>
              <div>
                <label className="label-sm">Type</label>
                <div className="relative">
                  <select {...register('discountType')} className="input-base appearance-none pr-6">
                    <option value="flat">Flat</option>
                    <option value="percentage">%</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label className="label-sm">Notes</label>
            <textarea {...register('notes')} className="input-base" rows={2} placeholder="Thank you for your business!" />
          </div>

          {/* Totals */}
          <div className="bg-primary-50 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Totals</h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-700"><span>Subtotal</span><span>{fmt(totals.subtotal)}</span></div>
              {totals.discountAmount > 0 && <div className="flex justify-between text-orange-600"><span>Discount</span><span>- {fmt(totals.discountAmount)}</span></div>}
              {watchedTax && totals.taxAmount > 0 && <div className="flex justify-between text-gray-700"><span>Tax</span><span>{fmt(totals.taxAmount)}</span></div>}
              <div className="border-t border-primary-200 pt-1.5 flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span><span>{fmt(totals.totalAmount)}</span>
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  )
}
