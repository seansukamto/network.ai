import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import CreateEventPage from './pages/CreateEventPage'
import EventDetailPage from './pages/EventDetailPage'
import JoinEventPage from './pages/JoinEventPage'
import MarkMetPage from './pages/MarkMetPage'
import AIAssistantPage from './pages/AIAssistantPage'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create-event" element={<CreateEventPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/join" element={<JoinEventPage />} />
          <Route path="/met" element={<MarkMetPage />} />
          <Route path="/ai" element={<AIAssistantPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

