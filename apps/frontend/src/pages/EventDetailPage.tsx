import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { eventApi, profileApi, connectionApi } from '../api/client'
import { Event, Attendee } from '../types'
import AttendeeCard from '../components/AttendeeCard'
import { useAuth } from '../contexts/AuthContext'

/**
 * Event detail page showing QR code and attendees
 */
export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [joinUrl, setJoinUrl] = useState<string>('')
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set())
  const [connectingUserIds, setConnectingUserIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (id) {
      loadEventDetails()
      loadUserProfile()
      loadConnections()
    }
  }, [id, user])

  const loadEventDetails = async () => {
    try {
      setLoading(true)
      
      // Load event details
      const eventResponse = await eventApi.getEvent(id!)
      setEvent(eventResponse.data)

      // Load QR code
      const qrResponse = await eventApi.getQRCode(id!)
      setQrCode(qrResponse.data.qrCode)
      setJoinUrl(qrResponse.data.url)

      // Load attendees
      const attendeesResponse = await eventApi.getAttendees(id!)
      
      // Transform the nested data structure to flat structure
      const transformedAttendees = attendeesResponse.data.map((attendance: any) => ({
        id: attendance.user?.id || attendance.id,
        name: attendance.user?.name || attendance.custom_name || 'Unknown',
        email: attendance.user?.email || '',
        company: attendance.user?.company || '',
        job_title: attendance.user?.job_title || '',
        bio: attendance.user?.bio || attendance.custom_bio || '',
        joined_at: attendance.joined_at,
        photo_url: attendance.user?.photo_url || null,
        linkedin_url: attendance.user?.linkedin_url || '',
        twitter_url: attendance.user?.twitter_url || '',
      }))
      
      setAttendees(transformedAttendees)

      setError(null)
    } catch (err) {
      setError('Failed to load event details')
      console.error('Error loading event:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadUserProfile = async () => {
    if (!user) return
    
    try {
      const response = await profileApi.getProfile()
      setCurrentUserProfile(response.data)
    } catch (err) {
      console.error('Error loading profile:', err)
    }
  }

  const loadConnections = async () => {
    if (!user) return
    
    try {
      const response = await connectionApi.getConnections()
      const connectionIds = new Set<string>(
        response.data.map((conn: any) => conn.connection?.id || conn.connection_id).filter((id: any) => id)
      )
      setConnectedUserIds(connectionIds)
    } catch (err) {
      console.error('Error loading connections:', err)
    }
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleConnect = async (attendeeId: string) => {
    if (!user || !id) return
    
    setConnectingUserIds(prev => new Set(prev).add(attendeeId))
    
    try {
      await connectionApi.addConnection({
        connection_id: attendeeId,
        session_id: id,
        tags: []
      })
      
      setConnectedUserIds(prev => new Set(prev).add(attendeeId))
      
      // Show success notification
      const attendee = attendees.find(a => a.id === attendeeId)
      if (attendee) {
        showToast(`Successfully connected with ${attendee.name}! 🎉`, 'success')
      }
    } catch (err: any) {
      console.error('Error connecting:', err)
      if (err.response?.status === 409) {
        showToast('You are already connected with this person', 'error')
        setConnectedUserIds(prev => new Set(prev).add(attendeeId))
      } else {
        showToast('Failed to connect. Please try again.', 'error')
      }
    } finally {
      setConnectingUserIds(prev => {
        const next = new Set(prev)
        next.delete(attendeeId)
        return next
      })
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(joinUrl)
    showToast('Link copied to clipboard! 📋', 'success')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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

  if (error || !event) {
    return (
      <div className="glass bg-red-50/80 border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center shadow-soft">
        <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span className="font-medium">{error || 'Event not found'}</span>
      </div>
    )
  }

  return (
    <div className="animate-slide-up">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 animate-slide-up ${
          toast.type === 'success' 
            ? 'bg-emerald-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}

      <div className="mb-6">
        <Link to="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 font-semibold transition-colors group">
          <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sessions
        </Link>
      </div>

      <div className="card p-8 mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold gradient-text mb-6">{event.name}</h1>
        
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex items-center text-dark-700">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-dark-500 uppercase font-semibold">Date & Time</p>
              <p className="font-medium">{formatDate(event.date)}</p>
            </div>
          </div>
          {event.location && (
            <div className="flex items-center text-dark-700">
              <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-dark-500 uppercase font-semibold">Location</p>
                <p className="font-medium">{event.location}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* QR Code */}
          <div>
            <h2 className="text-2xl font-bold text-dark-900 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Event QR Code
            </h2>
            <p className="text-dark-600 mb-6">
              Attendees can scan this QR code to join the event
            </p>
            {qrCode && (
              <div className="inline-block p-6 bg-white rounded-2xl border-4 border-dark-200 shadow-medium">
                <img src={qrCode} alt="Event QR Code" className="w-64 h-64 rounded-xl" />
              </div>
            )}
            <div className="mt-6">
              <p className="text-sm font-semibold text-dark-700 mb-3">Or share this link:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinUrl}
                  readOnly
                  className="flex-1 px-4 py-3 border-2 border-dark-200 rounded-xl text-sm bg-dark-50 font-mono text-dark-700"
                />
                <button
                  onClick={copyToClipboard}
                  className="btn-primary text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div>
            <h2 className="text-2xl font-bold text-dark-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Event Stats
            </h2>
            <div className="space-y-4">
              <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg">
                <div className="relative z-10">
                  <p className="text-5xl font-bold text-white mb-2">{attendees.length}</p>
                  <p className="text-primary-100 font-medium">Total Attendees</p>
                </div>
                <div className="absolute top-0 right-0 opacity-10">
                  <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200">
                <p className="text-sm font-semibold text-emerald-700 mb-2">Event ID</p>
                <p className="text-xs text-emerald-600 font-mono break-all">{event.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendees List */}
      <div className="card p-8">
        <h2 className="text-3xl font-bold text-dark-900 mb-6 flex items-center">
          <svg className="w-7 h-7 mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Attendees ({attendees.length})
        </h2>
        
        {attendees.length === 0 ? (
          <div className="text-center py-16 bg-dark-50 rounded-2xl">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-dark-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-dark-600 text-lg font-medium">
              No attendees yet. Share the QR code to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attendees.map((attendee) => (
              <AttendeeCard 
                key={attendee.id} 
                attendee={attendee}
                onConnect={user ? () => handleConnect(attendee.id) : undefined}
                isConnected={connectedUserIds.has(attendee.id)}
                isCurrentUser={currentUserProfile?.id === attendee.id}
                isConnecting={connectingUserIds.has(attendee.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

