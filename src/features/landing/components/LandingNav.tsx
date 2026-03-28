import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function LandingNav() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 text-primary-700 font-bold text-xl font-body"
        >
          <span>🌾</span>
          <span>AgriManagerX</span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-gray-600 hover:text-primary-700 text-sm font-medium transition-colors">Features</a>
          <a href="#pricing" className="text-gray-600 hover:text-primary-700 text-sm font-medium transition-colors">Pricing</a>
          <a href="#how-it-works" className="text-gray-600 hover:text-primary-700 text-sm font-medium transition-colors">How It Works</a>
          <button
            onClick={() => navigate('/auth/signin')}
            className="text-primary-700 text-sm font-semibold hover:text-primary-800 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/auth/signup')}
            className="bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Get Started
          </button>
        </div>

        {/* Mobile: sign in + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={() => navigate('/auth/signin')}
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
          <a href="#features" onClick={() => setMenuOpen(false)} className="text-gray-700 font-medium">Features</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} className="text-gray-700 font-medium">Pricing</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="text-gray-700 font-medium">How It Works</a>
          <button
            onClick={() => { setMenuOpen(false); navigate('/auth/signup') }}
            className="bg-primary-600 text-white font-semibold py-2.5 rounded-lg"
          >
            Get Started Free
          </button>
        </div>
      )}
    </nav>
  )
}
