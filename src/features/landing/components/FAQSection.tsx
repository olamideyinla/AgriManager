import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useScrollReveal } from '../../../shared/hooks/useScrollReveal'

const faqs = [
  {
    q: 'Does it work without internet?',
    a: 'Yes. AgriManagerX is offline-first. All data is stored locally on your phone and syncs to the cloud whenever you have a connection.',
  },
  {
    q: 'What types of farming does it support?',
    a: 'Poultry (layers & broilers), dairy & beef cattle, fish ponds, and annual/perennial crops. More enterprise types coming soon.',
  },
  {
    q: 'Is my farm data private and secure?',
    a: 'Your data is encrypted in transit and at rest. Only you and your authorized team members can access it.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. All reports are exportable as PDF or CSV. You own your data and can download it any time.',
  },
  {
    q: 'How do I add team members?',
    a: 'From the More menu → Team. Send an invite code by SMS or WhatsApp. Workers scan a QR code or enter the code to join your farm.',
  },
  {
    q: 'What happens if I cancel my Pro plan?',
    a: 'Your data stays intact and you drop back to the Free tier. No data is ever deleted.',
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 hover:text-primary-700 transition-colors"
        aria-expanded={open}
      >
        <span className="font-semibold text-gray-900 font-body">{q}</span>
        <ChevronDown
          size={18}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? 200 : 0 }}
      >
        <p className="pb-4 text-gray-600 text-sm leading-relaxed">{a}</p>
      </div>
    </div>
  )
}

export function FAQSection() {
  const ref = useScrollReveal<HTMLDivElement>()

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl text-gray-900 mb-4">
            Common Questions
          </h2>
        </div>
        <div ref={ref} className="reveal bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-2">
          {faqs.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  )
}
