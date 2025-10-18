import { Attendee } from '../types'

interface AttendeeCardProps {
  attendee: Attendee
  onMarkMet?: () => void
}

/**
 * Attendee card component for displaying user information
 */
export default function AttendeeCard({ attendee, onMarkMet }: AttendeeCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-5 border border-gray-200">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 mb-1">
            {attendee.name}
          </h4>
          
          {attendee.job_title && (
            <p className="text-sm text-gray-700 mb-1">
              {attendee.job_title}
              {attendee.company && ` at ${attendee.company}`}
            </p>
          )}
          
          {attendee.email && (
            <p className="text-sm text-gray-600 mb-2">
              ✉️ {attendee.email}
            </p>
          )}
          
          {attendee.bio && (
            <p className="text-sm text-gray-600 mt-2 italic">
              "{attendee.bio}"
            </p>
          )}
          
          <p className="text-xs text-gray-500 mt-3">
            Joined: {new Date(attendee.joined_at).toLocaleDateString()}
          </p>
        </div>
        
        {onMarkMet && (
          <button
            onClick={onMarkMet}
            className="ml-4 px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors"
          >
            Mark as Met
          </button>
        )}
      </div>
    </div>
  )
}

