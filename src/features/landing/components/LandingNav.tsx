import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

const solutionLinks = [
  { to: '/solutions/livestock', label: 'Livestock Operations' },
  { to: '/solutions/crops', label: 'Crop & Field Management' },
  { to: '/solutions/machinery', label: 'Farm Machinery & Assets' },
]

export function LandingNav({ ctaTo }: { ctaTo?: string } = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [solutionsOpen, setSolutionsOpen] = useState(false)
  const solutionsRef = useRef<HTMLDivElement>(null)
  const ctaDest = ctaTo ?? '/auth/signup'
  // Subpages have light backgrounds under a fixed nav, so keep it solid off the homepage
  const solid = scrolled || location.pathname !== '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (solutionsRef.current && !solutionsRef.current.contains(e.target as Node)) {
        setSolutionsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const linkCls = 'text-gray-600 hover:text-primary-700 text-sm font-medium transition-colors'

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        solid ? 'bg-white shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-primary-700 font-bold text-xl font-body">
          <span>🌾</span>
          <span>AgriManagerX</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/features" className={linkCls}>Features</Link>

          {/* Solutions dropdown */}
          <div ref={solutionsRef} className="relative">
            <button
              onClick={() => setSolutionsOpen(o => !o)}
              className={`${linkCls} flex items-center gap-1`}
            >
              Solutions
              <ChevronDown size={14} className={`transition-transform ${solutionsOpen ? 'rotate-180' : ''}`} />
            </button>
            {solutionsOpen && (
              <div className="absolute top-full left-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 py-2">
                {solutionLinks.map((s) => (
                  <Link
                    key={s.to}
                    to={s.to}
                    onClick={() => setSolutionsOpen(false)}
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link to="/pricing" className={linkCls}>Pricing</Link>
          <Link to="/about" className={linkCls}>About</Link>
          <Link to="/demo" className={linkCls}>Demo</Link>
          <button
            onClick={() => navigate('/auth/welcome')}
            className="text-primary-700 text-sm font-semibold hover:text-primary-800 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate(ctaDest)}
            className="bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Get Started
          </button>
        </div>

        {/* Mobile: sign in + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={() => navigate('/auth/welcome')}
            className="text-primary-700 text-sm font-semibold"
          >
            Sign In
          </button>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-9 h-9 flex flex-col items-center justify-center gap-1.5"
            aria-label="Menu"
          >
            <span className={`block w-5 h-0.5 bg-gray-700 transition-transform origin-center ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-gray-700 transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-gray-700 transition-transform origin-center ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
          <Link to="/features" onClick={() => setMenuOpen(false)} className="text-gray-700 font-medium">Features</Link>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Solutions</p>
            <div className="flex flex-col gap-3 pl-3 border-l-2 border-primary-100">
              {solutionLinks.map((s) => (
                <Link key={s.to} to={s.to} onClick={() => setMenuOpen(false)} className="text-gray-700 font-medium">
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
          <Link to="/pricing" onClick={() => setMenuOpen(false)} className="text-gray-700 font-medium">Pricing</Link>
          <Link to="/about" onClick={() => setMenuOpen(false)} className="text-gray-700 font-medium">About</Link>
          <Link to="/demo" onClick={() => setMenuOpen(false)} className="text-gray-700 font-medium">Book a Demo</Link>
          <button
            onClick={() => { setMenuOpen(false); navigate(ctaDest) }}
            className="bg-primary-600 text-white font-semibold py-2.5 rounded-lg"
          >
            Get Started Free
          </button>
        </div>
      )}
    </nav>
  )
}
