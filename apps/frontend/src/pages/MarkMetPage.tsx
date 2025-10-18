import { useState, useEffect } from 'react'
import { userApi, meetingApi, eventApi } from '../api/client'
import { User, Event } from '../types'

/**
 * Mark meeting page - record that two users met
 */
export default function MarkMetPage() {
  const [users, setUsers] = useState<User[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [formData, setFormData] = useState({
    userAId: '',
    userBId: '',
    note: '',
    eventId: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [usersResponse, eventsResponse] = await Promise.all([
        userApi.getUsers(),
        eventApi.getEvents(),
      ])
      setUsers(usersResponse.data)
      setEvents(eventsResponse.data)
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load users and events')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.userAId || !formData.userBId) {
      setError('Please select both users')
      return
    }

    if (formData.userAId === formData.userBId) {
      setError('Cannot mark meeting with yourself')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await meetingApi.recordMeeting({
        userAId: formData.userAId,
        userBId: formData.userBId,
        note: formData.note,
        eventId: formData.eventId || undefined,
      })
      
      setSuccess(true)
      setFormData({
        userAId: '',
        userBId: '',
        note: '',
        eventId: '',
      })
      
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Failed to record meeting. Please try again.')
      console.error('Error recording meeting:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Mark Meeting</h1>
      <p className="text-gray-600 mb-8">
        Record that two people met at an event
      </p>

      <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            ✅ Meeting recorded successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="userAId" className="block text-sm font-medium text-gray-700 mb-2">
              First Person *
            </label>
            <select
              id="userAId"
              name="userAId"
              value={formData.userAId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a person...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.company && `- ${user.company}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="userBId" className="block text-sm font-medium text-gray-700 mb-2">
              Second Person *
            </label>
            <select
              id="userBId"
              name="userBId"
              value={formData.userBId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a person...</option>
              {users
                .filter((user) => user.id !== formData.userAId)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.company && `- ${user.company}`}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label htmlFor="eventId" className="block text-sm font-medium text-gray-700 mb-2">
              Event (Optional)
            </label>
            <select
              id="eventId"
              name="eventId"
              value={formData.eventId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select an event...</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} - {new Date(event.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Notes
            </label>
            <textarea
              id="note"
              name="note"
              value={formData.note}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any notes about this meeting (topics discussed, follow-ups, etc.)"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Recording...' : '🤝 Record Meeting'}
          </button>
        </form>
      </div>

      {users.length === 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <p className="font-medium">No users found</p>
          <p className="text-sm">Users need to join events before you can record meetings.</p>
        </div>
      )}
    </div>
  )
}

