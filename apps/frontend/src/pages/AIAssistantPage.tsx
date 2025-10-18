import { useState } from 'react'
import { aiApi } from '../api/client'
import { AIResponse, AIResult } from '../types'

/**
 * AI Assistant page for querying contacts
 */
export default function AIAssistantPage() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'auto' | 'rag' | 'cypher'>('auto')
  const [response, setResponse] = useState<AIResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exampleQueries = [
    'Who did I meet at TechSummit 2025 who works in AI?',
    'Find people I met who work in startups',
    'Show me all ML engineers I met',
    'Who works at Google that I met?',
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim()) {
      setError('Please enter a query')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await aiApi.query({ query, mode })
      setResponse(result.data)
    } catch (err) {
      setError('Failed to process query. Please try again.')
      console.error('Error querying AI:', err)
    } finally {
      setLoading(false)
    }
  }

  const useExampleQuery = (exampleQuery: string) => {
    setQuery(exampleQuery)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">🤖 AI Assistant</h1>
      <p className="text-gray-600 mb-8">
        Ask questions about the people you've met at events
      </p>

      {/* Query Form */}
      <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
              Your Question
            </label>
            <textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Who did I meet at TechSummit 2025 who works in AI?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="mode"
                  value="auto"
                  checked={mode === 'auto'}
                  onChange={(e) => setMode(e.target.value as 'auto')}
                  className="mr-2"
                />
                <span className="text-sm">Auto (Recommended)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="mode"
                  value="rag"
                  checked={mode === 'rag'}
                  onChange={(e) => setMode(e.target.value as 'rag')}
                  className="mr-2"
                />
                <span className="text-sm">Semantic Search</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="mode"
                  value="cypher"
                  checked={mode === 'cypher'}
                  onChange={(e) => setMode(e.target.value as 'cypher')}
                  className="mr-2"
                />
                <span className="text-sm">Graph Query</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : '🔍 Search'}
          </button>
        </form>

        {/* Example Queries */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((example, index) => (
              <button
                key={index}
                onClick={() => useExampleQuery(example)}
                className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8">
          {error}
        </div>
      )}

      {/* Results */}
      {response && (
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Results</h2>
            {response.mode_used && (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                {response.mode_used}
              </span>
            )}
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-900">{response.summary}</p>
          </div>

          {/* Results List */}
          {response.results.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No matching contacts found. Try a different query.
            </p>
          ) : (
            <div className="space-y-4">
              {response.results.map((result: AIResult, index: number) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {result.name}
                      </h3>
                      {result.jobTitle && (
                        <p className="text-sm text-gray-700">
                          {result.jobTitle}
                          {result.company && ` at ${result.company}`}
                        </p>
                      )}
                    </div>
                    {result.score !== undefined && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                        {Math.round(result.score * 100)}% match
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3 italic">
                    {result.why}
                  </p>

                  {result.event && (
                    <div className="text-sm text-gray-500">
                      📅 Event: {result.event.name}
                      {result.event.date && ` (${new Date(result.event.date).toLocaleDateString()})`}
                    </div>
                  )}

                  {result.met_at && (
                    <div className="text-sm text-gray-500">
                      🤝 Met: {new Date(result.met_at).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">How it works</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>
            <strong>Auto Mode:</strong> Automatically chooses the best search method based on your query
          </li>
          <li>
            <strong>Semantic Search:</strong> Uses AI embeddings to find people based on meaning and context
          </li>
          <li>
            <strong>Graph Query:</strong> Leverages relationship data to find connections through events
          </li>
        </ul>
      </div>
    </div>
  )
}

