import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sessionApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

interface Session {
  id: string;
  name: string;
  description: string;
  date: string;
  location: string;
  is_active: boolean;
  max_attendees: number | null;
  host: {
    id: string;
    name: string;
    photo_url: string | null;
  };
}

/**
 * Home page displaying all network sessions
 */
export default function HomePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const response = await sessionApi.getSessions()
      setSessions(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to load sessions')
      console.error('Error loading sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-200 rounded-full animate-spin border-t-primary-600"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-primary-400 opacity-20"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-up">
      {/* Hero Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6">
        <div className="space-y-3">
          <h1 className="text-5xl lg:text-6xl font-bold gradient-text">
            Network Sessions
          </h1>
          <p className="text-dark-600 text-lg max-w-2xl">
            Discover meaningful connections at AI-powered networking events
          </p>
        </div>
        {user && (
          <Link
            to="/create-session"
            className="btn-primary group"
          >
            <svg className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Session
          </Link>
        )}
      </div>

      {error && (
        <div className="glass border-red-200 bg-red-50/80 text-red-700 px-6 py-4 rounded-2xl mb-8 flex items-center shadow-soft">
          <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-24 card">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-dark-800 mb-4">
            No sessions available
          </h2>
          <p className="text-dark-600 mb-8 max-w-md mx-auto text-lg">
            {user 
              ? 'Create your first networking session to get started!'
              : 'Sign in to create and join networking sessions'
            }
          </p>
          {user ? (
            <Link to="/create-session" className="btn-primary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Session
            </Link>
          ) : (
            <Link to="/login" className="btn-primary">
              Get Started
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sessions.map((session, index) => (
            <Link
              key={session.id}
              to={`/session/${session.id}`}
              className="group relative overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Card Container */}
              <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-soft border border-white/50 p-6 hover:shadow-hard hover:scale-[1.02] transition-all duration-500 h-full">
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 via-transparent to-accent-50/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="mb-6">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-xl font-bold text-dark-900 group-hover:text-primary-700 transition-colors duration-300 line-clamp-2 leading-tight flex-1">
                        {session.name}
                      </h3>
                      {session.is_active && (
                        <div className="flex-shrink-0">
                          <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg">
                            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Active</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {session.description && (
                      <p className="text-dark-600 text-sm line-clamp-2 leading-relaxed">
                        {session.description}
                      </p>
                    )}
                  </div>

                  {/* Session Details */}
                  <div className="space-y-4">
                    {/* Location */}
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-dark-500 uppercase font-bold tracking-wider mb-1">Location</p>
                        <p className="text-sm font-semibold text-dark-800 truncate">{session.location}</p>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-100 to-accent-200 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-dark-500 uppercase font-bold tracking-wider mb-1">Date</p>
                        <p className="text-sm font-semibold text-dark-800">
                          {new Date(session.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Host */}
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <span className="text-white text-sm font-bold">
                          {session.host?.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-dark-500 uppercase font-bold tracking-wider mb-1">Hosted by</p>
                        <p className="text-sm font-semibold text-dark-800 truncate">
                          {session.host?.name || 'Unknown Host'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-6 pt-4 border-t border-dark-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-primary-600 font-semibold text-sm group-hover:text-primary-700 transition-colors">
                        <span>Join Session</span>
                        <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      {session.max_attendees && (
                        <div className="text-xs text-dark-500 bg-dark-100 px-2 py-1 rounded-lg">
                          Max {session.max_attendees}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-500/20 to-accent-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

