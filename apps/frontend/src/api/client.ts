import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor to include token in requests
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Session API (formerly Events)
export const sessionApi = {
  createSession: (data: { 
    name: string; 
    description?: string; 
    date?: string; 
    location?: string;
    max_attendees?: number;
  }) =>
    api.post('/sessions', data),
  
  getSessions: () =>
    api.get('/sessions'),
  
  getSession: (id: string) =>
    api.get(`/sessions/${id}`),
  
  getQRCode: (id: string) =>
    api.get(`/sessions/${id}/qr`),
  
  getAttendees: (id: string) =>
    api.get(`/sessions/${id}/attendees`),

  joinSession: (data: {
    token: string;
    custom_name?: string;
    custom_bio?: string;
    custom_interests?: string;
  }) =>
    api.post('/sessions/join', data),

  verifyToken: (token: string) =>
    api.get(`/sessions/verify/${token}`),
};

// Profile API
export const profileApi = {
  getProfile: () =>
    api.get('/profile'),
  
  updateProfile: (data: {
    name?: string;
    email?: string;
    company?: string;
    job_title?: string;
    bio?: string;
    interests?: string;
    linkedin_url?: string;
    twitter_url?: string;
  }) =>
    api.put('/profile', data),

  uploadPhoto: (formData: FormData) =>
    api.post('/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Connections API
export const connectionApi = {
  getConnections: () =>
    api.get('/connections'),
  
  addConnection: (data: {
    connection_id: string;
    session_id?: string;
    tags?: string[];
  }) =>
    api.post('/connections', data),

  getConnectionNotes: (connectionId: string) =>
    api.get(`/connections/${connectionId}/notes`),

  addConnectionNote: (connectionId: string, data: { note_text: string; note_type?: string }) =>
    api.post(`/connections/${connectionId}/notes`, data),
};

// AI API
export const aiApi = {
  query: (data: {
    query: string;
    mode?: 'auto' | 'rag' | 'cypher';
    userId?: string;
  }) =>
    api.post('/ai/query', data),
};

// Voice API
export const voiceApi = {
  textToSpeech: (data: { text: string }) =>
    api.post('/voice/tts', data),

  speechToText: (formData: FormData) =>
    api.post('/voice/stt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Integrations API
export const integrationsApi = {
  draftEmail: (data: {
    to: string;
    subject: string;
    body: string;
  }) =>
    api.post('/integrations/gmail/draft', data),

  suggestMeetingTimes: (data: {
    attendees: string[];
    duration: number;
    days_ahead?: number;
  }) =>
    api.post('/integrations/calendar/suggest-times', data),

  createCalendarEvent: (data: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    attendees?: string[];
  }) =>
    api.post('/integrations/calendar/create-event', data),
};

// User API
export const userApi = {
  getUsers: () =>
    api.get('/users'),
  
  getUser: (id: string) =>
    api.get(`/users/${id}`),
};

// Event API (alias for sessionApi for backward compatibility)
export const eventApi = {
  getEvents: () => sessionApi.getSessions(),
  getEvent: (id: string) => sessionApi.getSession(id),
  getQRCode: (id: string) => sessionApi.getQRCode(id),
  getAttendees: (id: string) => sessionApi.getAttendees(id),
};

// Join API (for QR code joining - anonymous, no auth required)
export const joinApi = {
  verifyToken: (token: string) => sessionApi.verifyToken(token),
  joinEvent: (data: {
    token: string;
    name: string;
    email?: string;
    company?: string;
    jobTitle?: string;
    bio?: string;
  }) =>
    api.post('/sessions/join-anonymous', data),
};

// Meeting API (for marking people as met)
export const meetingApi = {
  recordMeeting: (data: {
    userAId: string;
    userBId: string;
    note?: string;
    eventId?: string;
  }) =>
    api.post('/met', data),
  
  getMeetings: (userId: string) =>
    api.get(`/met/${userId}`),
};

