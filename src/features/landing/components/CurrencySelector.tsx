import { useState, useRef, useEffect } from 'react'
import { Globe, ChevronDown, X, Search } from 'lucide-react'
import { useCurrencyContext } from '../context/CurrencyContext'
import { SUPPORTED_COUNTRIES } from '../config/currencies'

export function CurrencySelector() {
  const { currency, countryCode, setCountry } = useCurrencyContext()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const currentCountry = SUPPORTED_COUNTRIES.find(c => c.code === countryCode)

  const filtered = SUPPORTED_COUNTRIES.filter(c =>
    search === '' ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.currencyCode.toLowerCase().includes(search.toLowerCase())
  )

  // Focus search input when modal opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 50)
      return () => clearTimeout(t)
    } else {
      setSearch('')
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      {/* Trigger pill */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors group"
        aria-label="Change currency"
      >
        <Globe size={14} className="opacity-60 group-hover:opacity-100" />
        <span>
          Prices in{' '}
          <span className="font-semibold text-gray-700 group-hover:text-primary-600">
            {currency.code}
            {currentCountry ? ` · ${currentCountry.flag}` : ''}
          </span>
        </span>
        <ChevronDown size={13} className="opacity-50" />
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="font-semibold text-gray-900 font-body">Choose your currency</h3>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search country or currency…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 px-2 pb-3">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">No results</p>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.code}
                    onClick={() => { setCountry(c.code); setOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      c.code === countryCode
                        ? 'bg-primary-50 text-primary-700'
                        : 'hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <span className="text-xl leading-none">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                    </div>
                    <span className={`text-xs font-mono font-semibold ${
                      c.code === countryCode ? 'text-primary-600' : 'text-gray-400'
                    }`}>
                      {c.currencyCode}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
