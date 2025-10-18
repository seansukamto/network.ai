import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Event API
export const eventApi = {
  createEvent: (data: { name: string; date: string; location: string }) =>
    api.post('/events', data),
  
  getEvents: () =>
    api.get('/events'),
  
  getEvent: (id: string) =>
    api.get(`/events/${id}`),
  
  getQRCode: (id: string) =>
    api.get(`/events/${id}/qr`),
  
  getAttendees: (id: string) =>
    api.get(`/events/${id}/attendees`),
};

// Join API
export const joinApi = {
  verifyToken: (token: string) =>
    api.get(`/join/verify/${token}`),
  
  joinEvent: (data: {
    token: string;
    name: string;
    email: string;
    company: string;
    jobTitle: string;
    bio: string;
  }) =>
    api.post('/join', data),
};

// Meeting API
export const meetingApi = {
  recordMeeting: (data: {
    userAId: string;
    userBId: string;
    note: string;
    eventId?: string;
  }) =>
    api.post('/met', data),
  
  getMeetings: (userId: string) =>
    api.get(`/met/${userId}`),
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

// User API
export const userApi = {
  getUsers: () =>
    api.get('/users'),
  
  getUser: (id: string) =>
    api.get(`/users/${id}`),
};

