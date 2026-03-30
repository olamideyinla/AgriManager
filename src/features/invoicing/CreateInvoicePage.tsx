import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, addDays } from 'date-fns'
import { ArrowLeft, Plus, Trash2, Loader2, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useCurrency } from '../../shared/hooks/useCurrency'
import { db } from '../../core/database/db'
import { newId, nowIso } from '../../shared/types/base'
import { calculateDocumentTotals, lineItemTotal } from './services/document-calculator'
import { getNextInvoiceNumber, getOrCreateInvoiceSettings } from './services/document-numbers'
import type { Invoice, InvoiceItem } from '../../shared/types'

// ── Schema ────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity:    z.coerce.number().positive('Must be > 0'),
  unit:        z.string().min(1, 'Required'),
  unitPrice:   z.coerce.number().min(0, 'Must be ≥ 0'),
})

const schema = z.object({
  buyerName:           z.string().min(1, 'Buyer name required'),
  buyerPhone:          z.string().optional(),
  buyerEmail:          z.string().email('Invalid email').optional().or(z.literal('')),
  buyerAddress:        z.string().optional(),
  issueDate:           z.string(),
  dueDate:             z.string(),
  taxEnabled:          z.boolean(),
  taxRate:             z.coerce.number().min(0).max(100).optional(),
  discount:            z.coerce.number().min(0).optional(),
  discountType:        z.enum(['flat', 'percentage']).optional(),
  notes:               z.string().optional(),
  terms:               z.string().optional(),
  enterpriseInstanceId:z.string().optional(),
  items:               z.array(itemSchema).min(1, 'Add at least one item'),
})

type FormValues = z.infer<typeof schema>

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreateInvoicePage() {
  const navigate       = useNavigate()
  const appUser        = useAuthStore(s => s.appUser)
  const { fmt }        = useCurrency()
  const [saving, setSaving] = useState(false)

  const settings = useLiveQuery(async () => {
    if (!appUser?.organizationId) return null
    return getOrCreateInvoiceSettings(appUser.organizationId)
  }, [appUser?.organizationId])

  const contacts = useLiveQuery(async () => {
    if (!appUser?.organizationId) return []
    return db.contacts.where('organizationId').equals(appUser.organizationId).toArray()
  }, [appUser?.organizationId], [])

  const enterprises = useLiveQuery(async () => {
    if (!appUser?.organizationId) return []
    return db.enterpriseInstances
      .filter(e => e.status === 'active')
      .toArray()
  }, [appUser?.organizationId], [])

  const today = format(new Date(), 'yyyy-MM-dd')
  const dueDefault = format(addDays(new Date(), settings?.defaultPaymentTermsDays ?? 30), 'yyyy-MM-dd')

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      issueDate:   today,
      dueDate:     dueDefault,
      taxEnabled:  settings?.taxEnabled ?? false,
      taxRate:     settings?.defaultTaxRate ?? undefined,
      discountType:'flat',
      notes:       settings?.defaultNotes ?? '',
      terms:       settings?.defaultTerms ?? '',
      items:       [{ description: '', quantity: 1, unit: 'pcs', unitPrice: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const watchedItems    = watch('items')
  const watchedTax      = watch('taxEnabled')
  const watchedTaxRate  = watch('taxRate')
  const watchedDiscount = watch('discount')
  const watchedDiscType = watch('discountType')

  const totals = calculateDocumentTotals(
    watchedItems ?? [],
    watchedTaxRate ?? null,
    watchedTax,
    watchedDiscount ?? null,
    watchedDiscType ?? null,
  )

  const onSubmit = useCallback(async (values: FormValues) => {
    if (!appUser?.organizationId) return
    setSaving(true)
    try {
      const ts             = nowIso()
      const invoiceNumber  = await getNextInvoiceNumber(appUser.organizationId)
      const invoiceId      = newId()
      const currency       = (await db.organizations.get(appUser.organizationId))?.currency ?? 'USD'

      const itemRows: InvoiceItem[] = values.items.map(item => ({
        id:          newId(),
        invoiceId,
        description: item.description,
        quantity:    item.quantity,
        unit:        item.unit,
        unitPrice:   item.unitPrice,
        total:       lineItemTotal(item.quantity, item.unitPrice),
        createdAt:   ts,
        updatedAt:   ts,
        syncStatus:  'pending',
      }))

      const invoice: Invoice = {
        id:                   invoiceId,
        organizationId:       appUser.organizationId,
        invoiceNumber,
        status:               'draft',
        buyerId:              null,
        buyerName:            values.buyerName,
        buyerPhone:           values.buyerPhone ?? null,
        buyerEmail:           values.buyerEmail ?? null,
        buyerAddress:         values.buyerAddress ?? null,
        issueDate:            values.issueDate,
        dueDate:              values.dueDate,
        subtotal:             totals.subtotal,
        taxRate:              values.taxEnabled ? (values.taxRate ?? null) : null,
        taxLabel:             settings?.taxLabel ?? 'Tax',
        taxAmount:            totals.taxAmount > 0 ? totals.taxAmount : null,
        discount:             values.discount ?? null,
        discountType:         values.discountType ?? null,
        discountAmount:       totals.discountAmount > 0 ? totals.discountAmount : null,
        totalAmount:          totals.totalAmount,
        amountPaid:           0,
        amountDue:            totals.totalAmount,
        currency,
        notes:                values.notes ?? null,
        terms:                values.terms ?? null,
        enterpriseInstanceId: values.enterpriseInstanceId ?? null,
        createdAt:            ts,
        updatedAt:            ts,
        syncStatus:           'pending',
      }

      await db.transaction('rw', [db.invoices, db.invoiceItems], async () => {
        await db.invoices.add(invoice)
        await db.invoiceItems.bulkAdd(itemRows)
      })

      navigate(`/invoicing/invoice/${invoiceId}`, { replace: true })
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }, [appUser, settings, totals, navigate])

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col safe-top safe-bottom">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="touch-target text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">New Invoice</h1>
        <button
          form="invoice-form"
          type="submit"
          disabled={saving}
          className="bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save Draft'}
        </button>
      </div>

      <form id="invoice-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">

          {/* Buyer */}
          <Section title="Bill To">
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
                        setValue('buyerEmail', c.email ?? '')
                        setValue('buyerAddress', c.address ?? '')
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
            <Field label="Buyer Name *" error={errors.buyerName?.message}>
              <input {...register('buyerName')} className="input-base" placeholder="e.g. John Smith" />
            </Field>
            <Field label="Phone">
              <input {...register('buyerPhone')} type="tel" className="input-base" placeholder="+254 7XX XXX XXX" />
            </Field>
            <Field label="Email">
              <input {...register('buyerEmail')} type="email" className="input-base" />
            </Field>
            <Field label="Address">
              <textarea {...register('buyerAddress')} className="input-base" rows={2} />
            </Field>
          </Section>

          {/* Dates */}
          <Section title="Dates">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Issue Date">
                <input {...register('issueDate')} type="date" className="input-base" />
              </Field>
              <Field label="Due Date">
                <input {...register('dueDate')} type="date" className="input-base" />
              </Field>
            </div>
          </Section>

          {/* Items */}
          <Section title="Line Items">
            {errors.items?.root && (
              <p className="text-xs text-red-600 mb-2">{errors.items.root.message}</p>
            )}
            {fields.map((field, index) => (
              <div key={field.id} className="bg-gray-50 rounded-xl p-3 mb-3 relative">
                <Field label="Description" error={(errors.items?.[index]?.description as any)?.message}>
                  <input {...register(`items.${index}.description`)} className="input-base" placeholder="Product or service" />
                </Field>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Field label="Qty">
                    <input {...register(`items.${index}.quantity`)} type="number" inputMode="decimal" className="input-base text-center" step="any" />
                  </Field>
                  <Field label="Unit">
                    <input {...register(`items.${index}.unit`)} className="input-base text-center" placeholder="pcs" />
                  </Field>
                  <Field label="Unit Price">
                    <input {...register(`items.${index}.unitPrice`)} type="number" inputMode="decimal" className="input-base text-right" step="any" />
                  </Field>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    Total: <strong>{fmt(lineItemTotal(watchedItems?.[index]?.quantity ?? 0, watchedItems?.[index]?.unitPrice ?? 0))}</strong>
                  </span>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="text-red-400 touch-target">
                      <Trash2 size={16} />
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
              <Plus size={16} /> Add Item
            </button>
          </Section>

          {/* Tax & Discount */}
          <Section title="Tax & Discount">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Enable Tax</label>
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
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Field label="Tax Rate (%)">
                  <input {...register('taxRate')} type="number" inputMode="decimal" className="input-base" placeholder="16" step="0.1" />
                </Field>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Discount Amount">
                <input {...register('discount')} type="number" inputMode="decimal" className="input-base" placeholder="0" step="any" />
              </Field>
              <Field label="Discount Type">
                <div className="relative">
                  <select {...register('discountType')} className="input-base appearance-none pr-6">
                    <option value="flat">Flat</option>
                    <option value="percentage">%</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </Field>
            </div>
          </Section>

          {/* Enterprise link */}
          {enterprises && enterprises.length > 0 && (
            <Section title="Link to Enterprise">
              <div className="relative">
                <select {...register('enterpriseInstanceId')} className="input-base appearance-none pr-8">
                  <option value="">— none —</option>
                  {enterprises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </Section>
          )}

          {/* Notes / Terms */}
          <Section title="Notes & Terms">
            <Field label="Notes">
              <textarea {...register('notes')} className="input-base" rows={2} placeholder="Any notes for the buyer…" />
            </Field>
            <Field label="Terms & Conditions">
              <textarea {...register('terms')} className="input-base mt-2" rows={2} placeholder="Payment terms, return policy…" />
            </Field>
          </Section>

          {/* Totals summary */}
          <TotalsSummary totals={totals} fmt={fmt} taxLabel={settings?.taxLabel} taxRate={watchedTaxRate} taxEnabled={watchedTax} discount={watchedDiscount} discountType={watchedDiscType} />

        </div>
      </form>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-sm">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

function TotalsSummary({
  totals, fmt, taxLabel, taxRate, taxEnabled, discount, discountType,
}: {
  totals: { subtotal: number; taxAmount: number; discountAmount: number; totalAmount: number }
  fmt: (n: number) => string
  taxLabel?: string | null
  taxRate?: number
  taxEnabled: boolean
  discount?: number
  discountType?: string
}) {
  return (
    <div className="bg-primary-50 rounded-2xl p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Totals</h2>
      <div className="space-y-1.5">
        <Row label="Subtotal" value={fmt(totals.subtotal)} />
        {totals.discountAmount > 0 && (
          <Row
            label={discountType === 'percentage' ? `Discount (${discount}%)` : 'Discount'}
            value={`- ${fmt(totals.discountAmount)}`}
            className="text-orange-600"
          />
        )}
        {taxEnabled && totals.taxAmount > 0 && (
          <Row
            label={`${taxLabel ?? 'Tax'} (${taxRate}%)`}
            value={fmt(totals.taxAmount)}
          />
        )}
        <div className="border-t border-primary-200 pt-1.5 mt-1.5">
          <Row label="Total" value={fmt(totals.totalAmount)} bold />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-bold text-gray-900' : 'text-gray-700'} ${className ?? ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
