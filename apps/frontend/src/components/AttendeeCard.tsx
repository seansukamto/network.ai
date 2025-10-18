import { Attendee } from '../types'

interface AttendeeCardProps {
  attendee: Attendee
  onMarkMet?: () => void
  onConnect?: () => void
  isConnected?: boolean
  isCurrentUser?: boolean
  isConnecting?: boolean
}

/**
 * Attendee card component for displaying user information
 */
export default function AttendeeCard({ 
  attendee, 
  onMarkMet, 
  onConnect, 
  isConnected = false,
  isCurrentUser = false,
  isConnecting = false
}: AttendeeCardProps) {
  return (
    <div className="glass border-white/40 p-5 rounded-xl hover:shadow-medium transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
          {attendee.name.charAt(0).toUpperCase()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-lg font-bold text-dark-900 truncate">
              {attendee.name}
              {isCurrentUser && (
                <span className="ml-2 text-xs font-medium text-primary-600 bg-primary-100 px-2 py-1 rounded-full">You</span>
              )}
            </h4>
            <div className="flex gap-2 flex-shrink-0">
              {onConnect && !isCurrentUser && (
                <button
                  onClick={onConnect}
                  disabled={isConnected || isConnecting}
                  className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm ${
                    isConnected 
                      ? 'bg-emerald-100 text-emerald-700 cursor-default'
                      : isConnecting
                      ? 'bg-primary-300 text-white cursor-wait'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  {isConnecting ? (
                    <>
                      <svg className="w-3.5 h-3.5 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Connecting...
                    </>
                  ) : isConnected ? (
                    <>
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Connected
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Connect
                    </>
                  )}
                </button>
              )}
              {onMarkMet && (
                <button
                  onClick={onMarkMet}
                  className="inline-flex items-center px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark Met
                </button>
              )}
            </div>
          </div>
          
          {attendee.job_title && (
            <p className="text-sm text-dark-700 font-medium mb-1">
              {attendee.job_title}
              {attendee.company && (
                <span className="text-dark-500"> at {attendee.company}</span>
              )}
            </p>
          )}
          
          {attendee.email && (
            <a 
              href={`mailto:${attendee.email}`}
              className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-flex items-center transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {attendee.email}
            </a>
          )}
          
          {attendee.bio && (
            <p className="text-sm text-dark-600 mt-3 italic bg-dark-50 p-3 rounded-lg">
              "{attendee.bio}"
            </p>
          )}
          
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-dark-100">
            <p className="text-xs text-dark-500 flex items-center">
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {new Date(attendee.joined_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
            
            {(attendee.linkedin_url || attendee.twitter_url) && (
              <div className="flex gap-2">
                {attendee.linkedin_url && (
                  <a 
                    href={attendee.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0077B5] hover:text-[#006399] transition-colors"
                    title="LinkedIn"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                )}
                {attendee.twitter_url && (
                  <a 
                    href={attendee.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1DA1F2] hover:text-[#1a8cd8] transition-colors"
                    title="Twitter"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

