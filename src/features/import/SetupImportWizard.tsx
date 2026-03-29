import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, Upload, CheckCircle2, AlertCircle, AlertTriangle,
  ChevronDown, ChevronUp, FileText, Loader2,
} from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useSubscriptionStore } from '../../stores/subscription-store'
import { db } from '../../core/database/db'
import { SETUP_TEMPLATES, IMPORT_ORDER, type SetupTemplate } from './config/setup-templates'
import { downloadTemplate, downloadAllTemplates } from './services/template-generator'
import { parseSetupCSV, type ParseResult } from './services/csv-parser'
import { validateReferences } from './services/reference-validator'
import { processSetupImport, type ImportResult } from './services/import-processor'

// ── Types ──────────────────────────────────────────────────────────────────────

type WizardStep = 'welcome' | 'upload' | 'review' | 'importing' | 'complete'

interface FileState {
  file: File | null
  result: ParseResult | null
  parsing: boolean
  expanded: boolean
}

type FilesState = Record<string, FileState>

// ── Small helpers ──────────────────────────────────────────────────────────────

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <Loader2
      style={{ width: size, height: size }}
      className="animate-spin shrink-0"
    />
  )
}

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div className={`w-2 h-2 rounded-full transition-colors ${
      done ? 'bg-primary-600' : active ? 'bg-primary-400' : 'bg-gray-200'
    }`} />
  )
}

// ── File upload slot ───────────────────────────────────────────────────────────

interface UploadSlotProps {
  template: SetupTemplate
  state: FileState
  onFileSelected: (file: File) => void
  onClear: () => void
  onToggleExpand: () => void
}

function UploadSlot({ template, state, onFileSelected, onClear, onToggleExpand }: UploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { result, parsing, file, expanded } = state

  const hasErrors   = (result?.errorRows.length ?? 0) > 0
  const hasWarnings = (result?.warningRows.length ?? 0) > 0
  const validCount  = result?.validRows.length ?? 0
  const errorCount  = result?.errorRows.length ?? 0

  const statusColor = !file
    ? 'border-gray-200 bg-white'
    : hasErrors
    ? 'border-red-200 bg-red-50'
    : hasWarnings
    ? 'border-amber-200 bg-amber-50'
    : 'border-emerald-200 bg-emerald-50'

  if (template.comingSoon) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 bg-gray-50 opacity-60">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{template.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-700">{template.name}</p>
            <p className="text-xs text-gray-400">Coming soon</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`border-2 rounded-2xl p-4 transition-colors ${statusColor}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{template.name}</p>
          {parsing ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Spinner size={12} />
              <p className="text-xs text-gray-500">Checking…</p>
            </div>
          ) : result?.parseError ? (
            <p className="text-xs text-red-600 mt-0.5 truncate">{result.parseError}</p>
          ) : result?.isEmpty ? (
            <p className="text-xs text-gray-400 mt-0.5">File is empty</p>
          ) : result ? (
            <p className={`text-xs mt-0.5 font-medium ${hasErrors ? 'text-red-600' : hasWarnings ? 'text-amber-700' : 'text-emerald-700'}`}>
              {validCount} row{validCount !== 1 ? 's' : ''} ready
              {hasErrors ? ` · ${errorCount} error${errorCount !== 1 ? 's' : ''}` : ''}
              {hasWarnings ? ` · ${result.warningRows.length} warning${result.warningRows.length !== 1 ? 's' : ''}` : ''}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">{template.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {file && !parsing && (
            <button
              onClick={onToggleExpand}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          {file ? (
            <button
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-white/60"
            >
              Remove
            </button>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-200 px-3 py-1.5 rounded-xl hover:bg-primary-100 active:scale-95 transition-transform"
            >
              <Upload size={12} />
              Choose
            </button>
          )}
        </div>
      </div>

      {/* Expanded validation details */}
      {expanded && result && !result.parseError && (
        <div className="mt-3 pt-3 border-t border-current/10 space-y-1.5 max-h-48 overflow-y-auto">
          {result.missingRequiredColumns.length > 0 && (
            <p className="text-xs text-red-700 bg-red-100 rounded-lg px-2 py-1.5">
              Missing required columns: {result.missingRequiredColumns.join(', ')}
            </p>
          )}
          {result.detectedDateFormat && (
            <p className="text-xs text-gray-500 px-1">Dates detected as: {result.detectedDateFormat}</p>
          )}
          {result.unmappedColumns.length > 0 && (
            <p className="text-xs text-gray-400 px-1">
              Extra columns ignored: {result.unmappedColumns.join(', ')}
            </p>
          )}
          {result.errorRows.slice(0, 5).map(e => (
            <div key={e.rowNumber} className="text-xs text-red-700 bg-red-100 rounded-lg px-2 py-1.5">
              <span className="font-semibold">Row {e.rowNumber}:</span> {e.errors.join(' · ')}
            </div>
          ))}
          {result.errorRows.length > 5 && (
            <p className="text-xs text-red-500 px-1">…and {result.errorRows.length - 5} more errors</p>
          )}
          {result.warningRows.slice(0, 3).map(w => (
            <div key={w.rowNumber} className="text-xs text-amber-700 bg-amber-100 rounded-lg px-2 py-1.5">
              <span className="font-semibold">Row {w.rowNumber}:</span> {w.warnings.join(' · ')}
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onFileSelected(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ── Progress step row ──────────────────────────────────────────────────────────

function ProgressStep({ label, status }: { label: string; status: 'pending' | 'active' | 'done' }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {status === 'done' ? (
        <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
      ) : status === 'active' ? (
        <Spinner size={20} />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-gray-200 shrink-0" />
      )}
      <span className={`text-sm ${status === 'done' ? 'text-gray-700' : status === 'active' ? 'text-primary-700 font-semibold' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  )
}

// ── Main wizard ────────────────────────────────────────────────────────────────

interface SetupImportWizardProps {
  onSkip?: () => void
  /** If true, after completion navigate to /farm-setup?step=3 instead of /dashboard */
  fromOnboarding?: boolean
}

export default function SetupImportWizard({ onSkip, fromOnboarding = false }: SetupImportWizardProps) {
  const navigate = useNavigate()
  const appUser = useAuthStore(s => s.appUser)
  const tier = useSubscriptionStore(s => s.tier)

  const [step, setStep] = useState<WizardStep>('welcome')
  const [downloadingAll, setDownloadingAll] = useState(false)

  // File states per template ID
  const [files, setFiles] = useState<FilesState>(() =>
    Object.fromEntries(SETUP_TEMPLATES.map(t => [t.id, { file: null, result: null, parsing: false, expanded: false }]))
  )

  // Reference validation
  const [refErrors, setRefErrors] = useState<{ file: string; rowNumber: number; message: string }[]>([])
  const [refWarnings, setRefWarnings] = useState<{ file: string; rowNumber: number; message: string }[]>([])
  const [validatingRefs, setValidatingRefs] = useState(false)

  // Import progress
  const [importStep, setImportStep] = useState('')
  const [importStepIdx, setImportStepIdx] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // ── Redirect non-owners ────────────────────────────────────────────────────

  if (appUser && appUser.role !== 'owner') {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Owner Access Only</h2>
          <p className="text-sm text-gray-500 mb-6">Only the farm owner can import setup data.</p>
          <button onClick={() => navigate('/dashboard')} className="text-primary-700 font-semibold text-sm">
            Go to Dashboard →
          </button>
        </div>
      </div>
    )
  }

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFileSelected = useCallback(async (templateId: string, file: File) => {
    const template = SETUP_TEMPLATES.find(t => t.id === templateId)
    if (!template) return

    setFiles(prev => ({ ...prev, [templateId]: { file, result: null, parsing: true, expanded: false } }))

    const result = await parseSetupCSV(file, template)

    setFiles(prev => ({ ...prev, [templateId]: { file, result, parsing: false, expanded: result.errorRows.length > 0 || !!result.parseError } }))

    // Re-run reference validation
    const updatedFiles: Record<string, ParseResult> = {}
    setFiles(prev => {
      for (const id of IMPORT_ORDER) {
        const s = id === templateId ? { ...prev[id], result } : prev[id]
        if (s?.result && !s.result.parseError) updatedFiles[id] = s.result
      }
      return prev
    })
    // Slight delay to let state settle
    setTimeout(() => runRefValidation(updatedFiles), 100)
  }, [])

  const handleClear = useCallback((templateId: string) => {
    setFiles(prev => ({ ...prev, [templateId]: { file: null, result: null, parsing: false, expanded: false } }))
  }, [])

  const handleToggleExpand = useCallback((templateId: string) => {
    setFiles(prev => ({
      ...prev,
      [templateId]: { ...prev[templateId], expanded: !prev[templateId].expanded },
    }))
  }, [])

  const runRefValidation = useCallback(async (parsedFilesOverride?: Record<string, ParseResult>) => {
    if (!appUser) return
    const parsedFiles: Record<string, ParseResult> = parsedFilesOverride ?? {}
    if (!parsedFilesOverride) {
      for (const id of IMPORT_ORDER) {
        const s = files[id]
        if (s?.result && !s.result.parseError) parsedFiles[id] = s.result
      }
    }
    if (Object.keys(parsedFiles).length === 0) return
    setValidatingRefs(true)
    try {
      const res = await validateReferences(parsedFiles, appUser.organizationId, tier)
      setRefErrors(res.errors)
      setRefWarnings(res.warnings)
    } finally {
      setValidatingRefs(false)
    }
  }, [appUser, files, tier])

  // ── Computed state ─────────────────────────────────────────────────────────

  const uploadedCount = SETUP_TEMPLATES.filter(t => !t.comingSoon && files[t.id]?.result && !files[t.id].result?.parseError).length
  const anyParsing    = SETUP_TEMPLATES.some(t => files[t.id]?.parsing)
  const hasValidFile  = SETUP_TEMPLATES.some(t => !t.comingSoon && (files[t.id]?.result?.validRows.length ?? 0) > 0)
  const hasBlockingErrors = refErrors.some(e => e.rowNumber === 0) // tier limit errors

  const totalToCreate = {
    locations:      files['farm_locations']?.result?.validRows.length ?? 0,
    infrastructure: files['infrastructure']?.result?.validRows.length ?? 0,
    enterprises:    files['enterprises']?.result?.validRows.length ?? 0,
    inventory:      files['inventory']?.result?.validRows.length ?? 0,
    contacts:       files['contacts']?.result?.validRows.length ?? 0,
    animals:        0,
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!appUser) return
    setStep('importing')

    const parsedFiles: Record<string, ParseResult> = {}
    for (const id of IMPORT_ORDER) {
      const s = files[id]
      if (s?.result && !s.result.parseError) parsedFiles[id] = s.result
    }

    // Get default farm location
    const locs = await db.farmLocations.where('organizationId').equals(appUser.organizationId).toArray()
    const defaultLocId = locs[0]?.id ?? ''

    const result = await processSetupImport(
      parsedFiles,
      appUser.organizationId,
      defaultLocId,
      tier,
      (stepLabel, idx) => {
        setImportStep(stepLabel)
        setImportStepIdx(idx)
      },
    )

    setImportResult(result)
    setStep('complete')
  }

  // ── Steps rendering ────────────────────────────────────────────────────────

  const IMPORT_STEPS = ['Farm locations', 'Infrastructure', 'Active enterprises', 'Inventory items', 'Contacts', 'Animals']

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 safe-top">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (step === 'welcome') { onSkip ? onSkip() : navigate(-1) }
              else if (step === 'upload') setStep('welcome')
              else if (step === 'review') setStep('upload')
              else navigate(-1)
            }}
            className="p-1 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-gray-900">Import Farm Data</h1>
            <div className="flex items-center gap-1 mt-0.5">
              {(['welcome', 'upload', 'review', 'importing', 'complete'] as WizardStep[]).map((s, i) => (
                <StepDot key={s} active={s === step} done={['welcome', 'upload', 'review', 'importing', 'complete'].indexOf(step) > i} />
              ))}
            </div>
          </div>
          {step === 'welcome' && onSkip && (
            <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600">
              Skip
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">

        {/* ── STEP 1: Welcome ──────────────────────────────────────────────── */}
        {step === 'welcome' && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="text-center pt-2">
              <div className="text-5xl mb-3">📊</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Import your farm data</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Already keeping records? Download our templates, fill them in, and upload them back.
                Your farm will be set up in minutes — no manual entry required.
              </p>
            </div>

            {/* Download All */}
            <button
              onClick={async () => {
                setDownloadingAll(true)
                await downloadAllTemplates()
                setDownloadingAll(false)
              }}
              disabled={downloadingAll}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-transform"
            >
              {downloadingAll ? <Spinner /> : <Download size={18} />}
              {downloadingAll ? 'Preparing ZIP…' : 'Download All Templates (ZIP)'}
            </button>

            {/* Individual downloads */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <p className="text-xs font-semibold text-gray-500 px-4 pt-3 pb-1 uppercase tracking-wide">
                Or download individually
              </p>
              {SETUP_TEMPLATES.map(template => (
                <div
                  key={template.id}
                  className="flex items-center gap-3 px-4 py-3 border-t border-gray-50 first:border-0"
                >
                  <span className="text-xl">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{template.name}</p>
                    <p className="text-xs text-gray-400 truncate">{template.description}</p>
                  </div>
                  {template.comingSoon ? (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Soon</span>
                  ) : (
                    <button
                      onClick={() => downloadTemplate(template)}
                      className="flex items-center gap-1 text-xs font-semibold text-primary-700 bg-primary-50 px-3 py-1.5 rounded-xl hover:bg-primary-100 active:scale-95 transition-transform shrink-0"
                    >
                      <FileText size={12} />
                      CSV
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Tips for filling in the templates:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-700">
                <li>Columns marked with * are required</li>
                <li>Dates must be YYYY-MM-DD (e.g., 2025-09-15)</li>
                <li>Upload in order: Locations → Infrastructure → Enterprises → Inventory → Contacts</li>
                <li>You don't need all templates — upload only what you have</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── STEP 2: Upload ───────────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className="p-4 space-y-4 max-w-lg mx-auto">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Upload your files</h2>
              <p className="text-sm text-gray-500">Upload the CSV files you've filled in. You don't need all of them.</p>
            </div>

            {IMPORT_ORDER.map(id => {
              const template = SETUP_TEMPLATES.find(t => t.id === id)!
              return (
                <UploadSlot
                  key={id}
                  template={template}
                  state={files[id]}
                  onFileSelected={(file) => handleFileSelected(id, file)}
                  onClear={() => handleClear(id)}
                  onToggleExpand={() => handleToggleExpand(id)}
                />
              )
            })}

            {/* Cross-reference validation summary */}
            {uploadedCount > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {validatingRefs ? (
                    <><Spinner size={14} /><span className="text-xs text-gray-500">Checking references…</span></>
                  ) : refErrors.length === 0 && refWarnings.length === 0 ? (
                    <><CheckCircle2 size={14} className="text-emerald-500" /><span className="text-xs text-emerald-700 font-medium">All references look good</span></>
                  ) : (
                    <><AlertTriangle size={14} className="text-amber-500" /><span className="text-xs text-amber-700 font-medium">{refErrors.length} error{refErrors.length !== 1 ? 's' : ''}, {refWarnings.length} warning{refWarnings.length !== 1 ? 's' : ''}</span></>
                  )}
                </div>
                {refErrors.slice(0, 3).map((e, i) => (
                  <p key={i} className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{e.file}: {e.message}</p>
                ))}
                {refWarnings.slice(0, 2).map((w, i) => (
                  <p key={i} className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{w.file}: {w.message}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Review ───────────────────────────────────────────────── */}
        {step === 'review' && (
          <div className="p-4 space-y-4 max-w-lg mx-auto">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Review your import</h2>
              <p className="text-sm text-gray-500">Check what will be created before we start.</p>
            </div>

            {IMPORT_ORDER.map(id => {
              const template = SETUP_TEMPLATES.find(t => t.id === id)!
              const r = files[id]?.result
              if (!r || r.isEmpty || r.parseError || r.validRows.length === 0) return null

              const names = r.validRows
                .slice(0, 4)
                .map(row => (row['name'] ?? row['tagNumber'] ?? '') as string)
                .filter(Boolean)

              return (
                <div key={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{template.icon}</span>
                      <span className="text-sm font-bold text-gray-800">{template.name}</span>
                    </div>
                    <span className="text-sm font-bold text-primary-700">{r.validRows.length}</span>
                  </div>
                  <div className="space-y-1">
                    {names.map(n => (
                      <p key={n} className="text-xs text-gray-600 flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />{n}
                      </p>
                    ))}
                    {r.validRows.length > 4 && (
                      <p className="text-xs text-gray-400">…and {r.validRows.length - 4} more</p>
                    )}
                    {r.errorRows.length > 0 && (
                      <p className="text-xs text-amber-700 flex items-center gap-1.5 mt-1">
                        <AlertTriangle size={12} className="shrink-0" />
                        {r.errorRows.length} row{r.errorRows.length !== 1 ? 's' : ''} skipped due to errors
                      </p>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Totals */}
            <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
              <p className="text-sm font-bold text-primary-900 mb-2">This will create:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {([
                  ['📍', 'Locations', totalToCreate.locations],
                  ['🏠', 'Infrastructure', totalToCreate.infrastructure],
                  ['🐔', 'Enterprises', totalToCreate.enterprises],
                  ['📦', 'Inventory items', totalToCreate.inventory],
                  ['👤', 'Contacts', totalToCreate.contacts],
                ] as [string, string, number][]).map(([icon, label, count]) => count > 0 && (
                  <p key={label} className="text-xs text-primary-800">
                    {icon} {count} {label}
                  </p>
                ))}
              </div>
            </div>

            {/* Ref errors */}
            {refErrors.length > 0 && (
              <div className="space-y-1">
                {refErrors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 bg-red-50 rounded-xl px-3 py-2">
                    <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700">{e.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Ref warnings */}
            {refWarnings.length > 0 && (
              <div className="space-y-1">
                {refWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 bg-amber-50 rounded-xl px-3 py-2">
                    <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700">{w.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Importing ────────────────────────────────────────────── */}
        {step === 'importing' && (
          <div className="p-4 max-w-lg mx-auto">
            <div className="text-center mb-8 pt-4">
              <div className="text-5xl mb-3">⚡</div>
              <h2 className="text-xl font-bold text-gray-900">Setting up your farm…</h2>
              <p className="text-sm text-gray-500 mt-1">This will take just a moment</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-2 mb-5">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(importStepIdx / IMPORT_STEPS.length) * 100}%` }}
                />
              </div>
              {IMPORT_STEPS.map((label, i) => (
                <ProgressStep
                  key={label}
                  label={label}
                  status={
                    i < importStepIdx ? 'done'
                    : i === importStepIdx ? 'active'
                    : 'pending'
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 5: Complete ─────────────────────────────────────────────── */}
        {step === 'complete' && importResult && (
          <div className="p-4 max-w-lg mx-auto">
            <div className="text-center pt-4 mb-6">
              <div className="text-5xl mb-3">{importResult.success ? '🎉' : '⚠️'}</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {importResult.success ? 'Your farm is set up!' : 'Import completed with issues'}
              </h2>
              <p className="text-sm text-gray-500">
                Created: {importResult.created.locations} location{importResult.created.locations !== 1 ? 's' : ''},{' '}
                {importResult.created.infrastructure} infrastructure,{' '}
                {importResult.created.enterprises} enterprise{importResult.created.enterprises !== 1 ? 's' : ''},{' '}
                {importResult.created.inventory} inventory item{importResult.created.inventory !== 1 ? 's' : ''},{' '}
                {importResult.created.contacts} contact{importResult.created.contacts !== 1 ? 's' : ''}
              </p>
            </div>

            {importResult.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4 space-y-1">
                <p className="text-xs font-semibold text-amber-800 mb-1">Notices:</p>
                {importResult.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-700">• {w}</p>
                ))}
              </div>
            )}

            {importResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4 space-y-1">
                <p className="text-xs font-semibold text-red-800 mb-1">Errors (items not imported):</p>
                {importResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-700">• {e}</p>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 text-center mb-5">
              Your data is saved on this device and will sync to the cloud when you're online.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/daily-entry')}
                className="w-full py-3.5 rounded-2xl bg-primary-600 text-white font-bold text-sm active:scale-[0.98] transition-transform"
              >
                Start Entering Data →
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 active:scale-[0.98] transition-transform"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer nav */}
      {(step === 'welcome' || step === 'upload' || step === 'review') && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 py-3 safe-bottom">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            {step === 'welcome' && (
              <button
                onClick={() => setStep('upload')}
                className="flex-1 py-3.5 rounded-2xl bg-primary-600 text-white font-bold text-sm active:scale-[0.98] transition-transform"
              >
                I've filled in my templates →
              </button>
            )}

            {step === 'upload' && (
              <>
                <button
                  onClick={() => {
                    runRefValidation()
                    setStep('review')
                  }}
                  disabled={!hasValidFile || anyParsing || hasBlockingErrors}
                  className="flex-1 py-3.5 rounded-2xl bg-primary-600 text-white font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
                >
                  {anyParsing ? 'Checking files…' : 'Review & Import →'}
                </button>
              </>
            )}

            {step === 'review' && (
              <>
                <button
                  onClick={() => setStep('upload')}
                  className="py-3.5 px-5 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={hasBlockingErrors}
                  className="flex-1 py-3.5 rounded-2xl bg-primary-600 text-white font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
                >
                  Import Everything →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
