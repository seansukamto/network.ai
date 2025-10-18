import { useState, useEffect } from 'react';
import { connectionApi } from '../api/client';

interface Connection {
  id: string;
  connection: {
    id: string;
    name: string;
    company: string;
    job_title: string;
    photo_url: string | null;
    email?: string;
    bio?: string;
    linkedin_url?: string;
    twitter_url?: string;
  } | null;
  session: {
    id: string;
    name: string;
    date?: string;
    location?: string;
  } | null;
  created_at: string;
  met_at_session_name?: string;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const response = await connectionApi.getConnections();
      setConnections(response.data);
    } catch (err: any) {
      setError('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-200 rounded-full animate-spin border-t-primary-600"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-primary-400 opacity-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="mb-12">
        <h1 className="text-5xl lg:text-6xl font-bold gradient-text mb-3">
          My Connections
        </h1>
        <p className="text-dark-600 text-lg">
          People you've met at networking sessions
        </p>
      </div>

      {error && (
        <div className="glass border-red-200 bg-red-50/80 text-red-700 px-6 py-4 rounded-2xl mb-8 flex items-center shadow-soft">
          <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {connections.length === 0 ? (
        <div className="text-center py-24 card">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-dark-800 mb-4">
            No connections yet
          </h2>
          <p className="text-dark-600 max-w-md mx-auto text-lg">
            Join a networking session and start making meaningful connections!
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <p className="text-dark-600">
              <span className="text-2xl font-bold text-dark-900">{connections.length}</span> connection{connections.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.filter(conn => conn.connection).map((connection, index) => {
              const user = connection.connection!;
              const sessionName = connection.session?.name || connection.met_at_session_name;
              
              return (
                <div
                  key={connection.id}
                  className="card-interactive p-6"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start mb-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xl font-bold mr-4 flex-shrink-0">
                      {user.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-dark-900 mb-1 truncate">
                        {user.name || 'Unknown'}
                      </h3>
                      {user.job_title && (
                        <p className="text-sm text-dark-600 truncate">
                          {user.job_title}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-dark-100">
                    {user.company && (
                      <div className="flex items-center text-dark-600">
                        <svg className="w-5 h-5 mr-3 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-sm font-medium truncate">{user.company}</span>
                      </div>
                    )}
                    {sessionName && (
                      <div className="flex items-center text-dark-600">
                        <svg className="w-5 h-5 mr-3 text-accent-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-sm font-medium truncate">
                          {sessionName}
                        </span>
                      </div>
                    )}
                    {user.email && (
                      <div className="flex items-center text-dark-600">
                        <svg className="w-5 h-5 mr-3 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <a href={`mailto:${user.email}`} className="text-sm font-medium truncate hover:text-primary-600 transition-colors">
                          {user.email}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center text-dark-500">
                      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">
                        Connected {new Date(connection.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

