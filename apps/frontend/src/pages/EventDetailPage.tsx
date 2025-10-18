import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { eventApi } from '../api/client'
import { Event, Attendee } from '../types'
import AttendeeCard from '../components/AttendeeCard'

/**
 * Event detail page showing QR code and attendees
 */
export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [joinUrl, setJoinUrl] = useState<string>('')
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadEventDetails()
    }
  }, [id])

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
      setAttendees(attendeesResponse.data)

      setError(null)
    } catch (err) {
      setError('Failed to load event details')
      console.error('Error loading event:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(joinUrl)
    alert('Link copied to clipboard!')
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error || 'Event not found'}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Events
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8 border border-gray-200">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{event.name}</h1>
        
        <div className="space-y-2 text-gray-700 mb-6">
          <p className="flex items-center text-lg">
            <span className="mr-2">📅</span>
            {formatDate(event.date)}
          </p>
          {event.location && (
            <p className="flex items-center text-lg">
              <span className="mr-2">📍</span>
              {event.location}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* QR Code */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Event QR Code</h2>
            <p className="text-gray-600 mb-4">
              Attendees can scan this QR code to join the event
            </p>
            {qrCode && (
              <div className="bg-white p-4 rounded-lg border-2 border-gray-300 inline-block">
                <img src={qrCode} alt="Event QR Code" className="w-64 h-64" />
              </div>
            )}
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Or share this link:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Event Stats</h2>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-3xl font-bold text-blue-600">{attendees.length}</p>
                <p className="text-gray-700">Total Attendees</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Event ID</p>
                <p className="text-xs text-gray-500 font-mono break-all">{event.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendees List */}
      <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Attendees ({attendees.length})
        </h2>
        
        {attendees.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            No attendees yet. Share the QR code to get started!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attendees.map((attendee) => (
              <AttendeeCard key={attendee.id} attendee={attendee} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

