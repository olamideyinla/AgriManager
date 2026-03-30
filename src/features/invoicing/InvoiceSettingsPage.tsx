import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { db } from '../../core/database/db'
import { nowIso } from '../../shared/types/base'
import { getOrCreateInvoiceSettings } from './services/document-numbers'
import type { InvoiceSettings } from '../../shared/types'

// ── Component ─────────────────────────────────────────────────────────────────

export default function InvoiceSettingsPage() {
  const navigate   = useNavigate()
  const appUser    = useAuthStore(s => s.appUser)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const settings = useLiveQuery(async () => {
    if (!appUser?.organizationId) return null
    return getOrCreateInvoiceSettings(appUser.organizationId)
  }, [appUser?.organizationId])

  const [form, setForm] = useState<Partial<InvoiceSettings>>({})

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings?.id])

  const field = (key: keyof InvoiceSettings) => ({
    value:    (form[key] ?? '') as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  const toggle = (key: keyof InvoiceSettings) => ({
    checked: !!(form[key]),
    onChange: () => setForm(f => ({ ...f, [key]: !f[key] })),
  })

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const ts = nowIso()
      const updates: Partial<InvoiceSettings> = {
        ...form,
        updatedAt:  ts,
        syncStatus: 'pending',
      }
      await db.invoiceSettings.update(settings.id, updates)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (!settings) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col safe-top safe-bottom">
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="touch-target text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Invoice Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Numbering */}
        <Section title="Document Numbers">
          <Row label="Invoice Prefix">
            <input {...field('invoicePrefix')} className="input-base" placeholder="INV" maxLength={10} />
          </Row>
          <Row label="Receipt Prefix">
            <input {...field('receiptPrefix')} className="input-base mt-2" placeholder="RCT" maxLength={10} />
          </Row>
          <Row label="Default Payment Terms (days)">
            <input
              type="number"
              inputMode="numeric"
              value={form.defaultPaymentTermsDays ?? 30}
              onChange={e => setForm(f => ({ ...f, defaultPaymentTermsDays: parseInt(e.target.value) || 30 }))}
              className="input-base mt-2"
            />
          </Row>
        </Section>

        {/* Business info */}
        <Section title="Your Business Details">
          <p className="text-xs text-gray-400 mb-3">Shown on invoices & receipts. Leave blank to use farm name from profile.</p>
          <Row label="Business Name">
            <input {...field('farmName')} className="input-base" placeholder="My Farm" />
          </Row>
          <Row label="Address">
            <textarea
              value={(form.farmAddress ?? '') as string}
              onChange={e => setForm(f => ({ ...f, farmAddress: e.target.value }))}
              className="input-base mt-2"
              rows={2}
              placeholder="Farm address"
            />
          </Row>
          <Row label="Phone">
            <input {...field('farmPhone')} type="tel" className="input-base mt-2" />
          </Row>
          <Row label="Email">
            <input {...field('farmEmail')} type="email" className="input-base mt-2" />
          </Row>
        </Section>

        {/* Tax */}
        <Section title="Tax">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Enable Tax by Default</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" {...toggle('taxEnabled')} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-300 peer-checked:bg-primary-600 rounded-full transition-colors peer-checked:after:translate-x-5 after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform" />
            </label>
          </div>
          <Row label="Tax Label">
            <input {...field('taxLabel')} className="input-base" placeholder="VAT" />
          </Row>
          <Row label="Default Tax Rate (%)">
            <input
              type="number"
              inputMode="decimal"
              value={form.defaultTaxRate ?? ''}
              onChange={e => setForm(f => ({ ...f, defaultTaxRate: parseFloat(e.target.value) || null }))}
              className="input-base mt-2"
              placeholder="16"
              step="0.1"
            />
          </Row>
        </Section>

        {/* Payment details */}
        <Section title="Payment Details">
          <Row label="Bank Account Details">
            <textarea
              value={(form.bankDetails ?? '') as string}
              onChange={e => setForm(f => ({ ...f, bankDetails: e.target.value || null }))}
              className="input-base"
              rows={3}
              placeholder="Bank: ABC Bank&#10;Account: 1234567890&#10;Branch: City Branch"
            />
          </Row>
          <Row label="Mobile Money">
            <input
              value={(form.mobileMoney ?? '') as string}
              onChange={e => setForm(f => ({ ...f, mobileMoney: e.target.value || null }))}
              className="input-base mt-2"
              placeholder="e.g. M-Pesa: 0700 000 000"
            />
          </Row>
        </Section>

        {/* Defaults */}
        <Section title="Default Text">
          <Row label="Default Invoice Notes">
            <textarea
              value={(form.defaultNotes ?? '') as string}
              onChange={e => setForm(f => ({ ...f, defaultNotes: e.target.value || null }))}
              className="input-base"
              rows={2}
              placeholder="Thank you for your business!"
            />
          </Row>
          <Row label="Default Terms & Conditions">
            <textarea
              value={(form.defaultTerms ?? '') as string}
              onChange={e => setForm(f => ({ ...f, defaultTerms: e.target.value || null }))}
              className="input-base mt-2"
              rows={3}
              placeholder="Payment due within 30 days. Late payments subject to 2% monthly interest."
            />
          </Row>
          <Row label="Receipt Footer">
            <input
              value={(form.receiptFooter ?? '') as string}
              onChange={e => setForm(f => ({ ...f, receiptFooter: e.target.value || null }))}
              className="input-base mt-2"
              placeholder="Thank you for your purchase!"
            />
          </Row>
        </Section>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-sm">{label}</label>
      {children}
    </div>
  )
}
