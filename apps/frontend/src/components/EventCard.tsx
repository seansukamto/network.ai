import { Link } from 'react-router-dom'
import { Event } from '../types'

interface EventCardProps {
  event: Event
}

/**
 * Event card component for displaying event information
 */
export default function EventCard({ event }: EventCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Link
      to={`/events/${event.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 p-6 border border-gray-200"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {event.name}
          </h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p className="flex items-center">
              <span className="mr-2">📅</span>
              {formatDate(event.date)}
            </p>
            {event.location && (
              <p className="flex items-center">
                <span className="mr-2">📍</span>
                {event.location}
              </p>
            )}
          </div>
        </div>
        <div className="ml-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  )
}

