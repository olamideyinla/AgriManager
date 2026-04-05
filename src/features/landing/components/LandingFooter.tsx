import { useNavigate, Link } from 'react-router-dom'

export function LandingFooter() {
  const navigate = useNavigate()

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div>
            <p className="text-white font-bold text-xl mb-2 font-body">🌾 AgriManagerX</p>
            <p className="text-sm leading-relaxed text-gray-500">
              Offline-first farm management built for smallholder farmers across Africa, Asia, and Latin America.
            </p>
            <p className="mt-4 text-sm">Made with ♥ for smallholder farmers</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3 font-body">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3 font-body">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://wa.me/PHONENUMBER?text=Hi%2C%20I%20need%20help%20with%20AgriManagerX"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Contact via WhatsApp
                </a>
              </li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Partners */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3 font-body">Partners</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/partners" className="hover:text-white transition-colors">
                  Partner Program
                </Link>
              </li>
              <li>
                <Link to="/partners/apply" className="hover:text-white transition-colors">
                  Apply to Partner
                </Link>
              </li>
              <li>
                <Link to="/partners/signin" className="hover:text-white transition-colors">
                  Partner Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3 font-body">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">
                  Terms of Service
                </button>
              </li>
            </ul>

            {/* Social icons */}
            <div className="flex gap-3 mt-4">
              <a
                href="https://twitter.com/agrimanagerx"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors text-xs font-bold text-white"
              >
                𝕏
              </a>
              <a
                href="https://wa.me/PHONENUMBER"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <svg viewBox="0 0 24 24" fill="white" width="14" height="14">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} AgriManagerX · All rights reserved
        </div>
      </div>
    </footer>
  )
}
