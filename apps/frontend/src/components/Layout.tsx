import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

/**
 * Main layout component with modern navigation
 */
export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { user, signOut } = useAuth()

  const isActive = (path: string) => {
    return location.pathname === path
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo & Brand */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all duration-300 group-hover:scale-110">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold gradient-text hidden sm:block">network.ai</span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              <Link
                to="/"
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive('/')
                    ? 'bg-primary-100 text-primary-700 shadow-sm'
                    : 'text-dark-600 hover:bg-white/60 hover:text-primary-600'
                }`}
              >
                Sessions
              </Link>
              {user && (
                <>
                  <Link
                    to="/create-session"
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive('/create-session')
                        ? 'bg-primary-100 text-primary-700 shadow-sm'
                        : 'text-dark-600 hover:bg-white/60 hover:text-primary-600'
                    }`}
                  >
                    Create
                  </Link>
                  <Link
                    to="/connections"
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive('/connections')
                        ? 'bg-primary-100 text-primary-700 shadow-sm'
                        : 'text-dark-600 hover:bg-white/60 hover:text-primary-600'
                    }`}
                  >
                    Connections
                  </Link>
                  <Link
                    to="/ai"
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive('/ai')
                        ? 'bg-accent-100 text-accent-700 shadow-sm'
                        : 'text-dark-600 hover:bg-white/60 hover:text-accent-600'
                    }`}
                  >
                    AI Assistant
                  </Link>
                  <Link
                    to="/profile"
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive('/profile')
                        ? 'bg-primary-100 text-primary-700 shadow-sm'
                        : 'text-dark-600 hover:bg-white/60 hover:text-primary-600'
                    }`}
                  >
                    Profile
                  </Link>
                </>
              )}
            </div>

            {/* Auth Actions */}
            <div className="flex items-center space-x-3">
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-dark-600 hover:bg-white/60 transition-all duration-200"
                >
                  Sign Out
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-dark-600 hover:bg-white/60 transition-all duration-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="btn-primary text-sm"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
        {children}
      </main>

      {/* Footer */}
      <footer className="glass border-t border-white/20 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-dark-600 text-sm font-medium">
                AI-powered professional networking
              </span>
            </div>
            <p className="text-dark-500 text-sm">
              © 2025 network.ai. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

