/**
 * MCP Client - Orchestrates all MCP servers for Claude
 * Provides a unified interface to interact with Supabase, Gmail, and Calendar tools
 */

import { createSupabaseMCPServer } from './supabase-mcp';
import { createGmailMCPServer } from './gmail-mcp';
import { createCalendarMCPServer } from './calendar-mcp';

/**
 * All available MCP tools across all servers
 */
export const getAllMCPTools = () => {
  return [
    // Supabase tools
    {
      name: 'get_user_connections',
      description: 'Get all connections (saved contacts) for a user',
      input_schema: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'The user ID to get connections for',
          },
        },
        required: ['user_id'],
      },
    },
    {
      name: 'search_connections',
      description: 'Search through user connections by name, company, or job title',
      input_schema: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'The user ID',
          },
          query: {
            type: 'string',
            description: 'Search query (name, company, or job title)',
          },
        },
        required: ['user_id', 'query'],
      },
    },
    {
      name: 'get_connection_notes',
      description: 'Get all notes for a specific connection',
      input_schema: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'The user ID',
          },
          connection_id: {
            type: 'string',
            description: 'The connection ID',
          },
        },
        required: ['user_id', 'connection_id'],
      },
    },
    {
      name: 'add_connection_note',
      description: 'Add a note to a connection',
      input_schema: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'The user ID',
          },
          connection_id: {
            type: 'string',
            description: 'The connection ID',
          },
          note_text: {
            type: 'string',
            description: 'The note text',
          },
          note_type: {
            type: 'string',
            enum: ['general', 'meeting', 'followup', 'idea', 'reminder'],
            description: 'Type of note',
          },
        },
        required: ['user_id', 'connection_id', 'note_text'],
      },
    },
    {
      name: 'get_network_sessions',
      description: 'Get all network sessions for a user',
      input_schema: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'The user ID',
          },
        },
        required: ['user_id'],
      },
    },
    // Gmail tools
    {
      name: 'draft_email',
      description: 'Create a draft email to a connection (does not send automatically)',
      input_schema: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Recipient email address',
          },
          subject: {
            type: 'string',
            description: 'Email subject',
          },
          body: {
            type: 'string',
            description: 'Email body (HTML or plain text)',
          },
          from_name: {
            type: 'string',
            description: 'Sender name (optional)',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
    // Calendar tools
    {
      name: 'check_availability',
      description: 'Check calendar availability for a specific time range',
      input_schema: {
        type: 'object',
        properties: {
          start_time: {
            type: 'string',
            description: 'Start time (ISO 8601 format)',
          },
          end_time: {
            type: 'string',
            description: 'End time (ISO 8601 format)',
          },
        },
        required: ['start_time', 'end_time'],
      },
    },
    {
      name: 'suggest_meeting_times',
      description: 'Suggest available meeting times based on calendar availability',
      input_schema: {
        type: 'object',
        properties: {
          duration_minutes: {
            type: 'number',
            description: 'Meeting duration in minutes',
          },
          preferred_days: {
            type: 'array',
            items: { type: 'string' },
            description: 'Preferred days (e.g., ["Monday", "Wednesday"])',
          },
          time_min: {
            type: 'string',
            description: 'Earliest acceptable time (HH:MM format)',
          },
          time_max: {
            type: 'string',
            description: 'Latest acceptable time (HH:MM format)',
          },
        },
        required: ['duration_minutes'],
      },
    },
  ];
};

/**
 * Format MCP tools for Claude API
 */
export const formatToolsForClaude = () => {
  return getAllMCPTools();
};

/**
 * Initialize MCP servers (if needed for standalone operation)
 */
export const initializeMCPServers = () => {
  const supabaseServer = createSupabaseMCPServer();
  const gmailServer = createGmailMCPServer();
  const calendarServer = createCalendarMCPServer();

  return {
    supabase: supabaseServer,
    gmail: gmailServer,
    calendar: calendarServer,
  };
};

