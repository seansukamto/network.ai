/**
 * Event entity
 */
export interface Event {
  id: string;
  name: string;
  date: Date;
  location: string;
  qr_code_token: string;
  created_at: Date;
}

/**
 * User/Person entity
 */
export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  job_title: string;
  bio: string;
  created_at: Date;
}

/**
 * Attendance relationship
 */
export interface Attendance {
  id: string;
  user_id: string;
  event_id: string;
  joined_at: Date;
}

/**
 * Vector embedding entity
 */
export interface Vector {
  id: string;
  owner_type: 'person' | 'note';
  owner_id: string;
  embedding: number[];
  text_content: string;
  created_at: Date;
}

/**
 * AI query modes
 */
export type AIQueryMode = 'auto' | 'rag' | 'cypher';

/**
 * AI query request
 */
export interface AIQueryRequest {
  query: string;
  mode: AIQueryMode;
  userId?: string;
}

/**
 * AI query result
 */
export interface AIQueryResult {
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

/**
 * AI query response
 */
export interface AIQueryResponse {
  results: AIQueryResult[];
  summary: string;
  mode_used?: string;
}

/**
 * Meeting note
 */
export interface MeetingNote {
  userAId: string;
  userBId: string;
  note: string;
  eventId: string;
}

