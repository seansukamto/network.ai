export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  qr_code_token: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  job_title: string;
  bio: string;
  created_at: string;
}

export interface Attendee extends User {
  joined_at: string;
}

export interface Meeting {
  id: string;
  name: string;
  company: string;
  jobTitle: string;
  email: string;
  note: string;
  metAt: string;
  eventId?: string;
}

export interface AIResult {
  id: string;
  name: string;
  company: string;
  jobTitle: string;
  why: string;
  event?: {
    name: string;
    date?: string;
  };
  met_at?: string;
  score?: number;
}

export interface AIResponse {
  results: AIResult[];
  summary: string;
  mode_used?: string;
}

