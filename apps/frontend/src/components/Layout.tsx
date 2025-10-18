import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
}

/**
 * Main layout component with navigation
 */
export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path
      ? 'bg-blue-700 text-white'
      : 'text-blue-100 hover:bg-blue-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-4">
              <Link
                to="/"
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${isActive(
                  '/'
                )}`}
              >
                🏠 Events
              </Link>
              <Link
                to="/create-event"
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${isActive(
                  '/create-event'
                )}`}
              >
                ✨ Create Event
              </Link>
              <Link
                to="/met"
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${isActive(
                  '/met'
                )}`}
              >
                🤝 Mark Meeting
              </Link>
              <Link
                to="/ai"
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${isActive(
                  '/ai'
                )}`}
              >
                🤖 AI Assistant
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            Event Networking App - Track connections and grow your network 🚀
          </p>
        </div>
      </footer>
    </div>
  )
}

