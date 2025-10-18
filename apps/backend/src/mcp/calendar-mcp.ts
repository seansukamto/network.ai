/**
 * Google Calendar MCP Server
 * Exposes Google Calendar operations as MCP tools for Claude
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';

/**
 * MCP Tool definitions for Calendar operations
 */
const CALENDAR_TOOLS = [
  {
    name: 'check_availability',
    description: 'Check calendar availability for a specific time range',
    inputSchema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: "User's Google Calendar access token",
        },
        start_time: {
          type: 'string',
          description: 'Start time (ISO 8601 format)',
        },
        end_time: {
          type: 'string',
          description: 'End time (ISO 8601 format)',
        },
      },
      required: ['access_token', 'start_time', 'end_time'],
    },
  },
  {
    name: 'create_event',
    description: 'Create a calendar event (requires user confirmation in UI)',
    inputSchema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: "User's Google Calendar access token",
        },
        summary: {
          type: 'string',
          description: 'Event title',
        },
        description: {
          type: 'string',
          description: 'Event description',
        },
        start_time: {
          type: 'string',
          description: 'Start time (ISO 8601 format)',
        },
        end_time: {
          type: 'string',
          description: 'End time (ISO 8601 format)',
        },
        attendee_emails: {
          type: 'array',
          items: { type: 'string' },
          description: 'Attendee email addresses',
        },
        location: {
          type: 'string',
          description: 'Event location (optional)',
        },
      },
      required: ['access_token', 'summary', 'start_time', 'end_time'],
    },
  },
  {
    name: 'suggest_meeting_times',
    description: 'Suggest available meeting times based on calendar availability',
    inputSchema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: "User's Google Calendar access token",
        },
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
      required: ['access_token', 'duration_minutes'],
    },
  },
];

/**
 * Execute Calendar MCP tool
 */
async function executeCalendarTool(name: string, args: any): Promise<any> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: args.access_token });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  switch (name) {
    case 'check_availability': {
      const { start_time, end_time } = args;

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: start_time,
          timeMax: end_time,
          items: [{ id: 'primary' }],
        },
      });

      const busy = response.data.calendars?.primary?.busy || [];
      const isFree = busy.length === 0;

      return {
        is_available: isFree,
        busy_periods: busy,
        message: isFree
          ? 'Time slot is available'
          : 'Time slot has conflicts',
      };
    }

    case 'create_event': {
      const {
        summary,
        description,
        start_time,
        end_time,
        attendee_emails,
        location,
      } = args;

      const event = {
        summary,
        description,
        location,
        start: {
          dateTime: start_time,
          timeZone: 'UTC',
        },
        end: {
          dateTime: end_time,
          timeZone: 'UTC',
        },
        attendees: attendee_emails
          ? attendee_emails.map((email: string) => ({ email }))
          : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all',
      });

      return {
        success: true,
        event_id: response.data.id,
        event_link: response.data.htmlLink,
        message: 'Event created successfully',
      };
    }

    case 'suggest_meeting_times': {
      const { duration_minutes, time_min, time_max } = args;

      // Get events for next 7 days
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: nextWeek.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      // Simple algorithm: find gaps between events
      const suggestions = [];
      const minTime = time_min || '09:00';
      const maxTime = time_max || '17:00';

      for (let day = 0; day < 7; day++) {
        const checkDate = new Date(now);
        checkDate.setDate(checkDate.getDate() + day);
        checkDate.setHours(parseInt(minTime.split(':')[0]), parseInt(minTime.split(':')[1]), 0);

        const endOfDay = new Date(checkDate);
        endOfDay.setHours(parseInt(maxTime.split(':')[0]), parseInt(maxTime.split(':')[1]), 0);

        // Check if this time slot is free
        const isTimeFree = !events.some((event) => {
          const eventStart = new Date(event.start?.dateTime || '');
          const eventEnd = new Date(event.end?.dateTime || '');
          return (
            checkDate >= eventStart &&
            checkDate < eventEnd
          );
        });

        if (isTimeFree && suggestions.length < 3) {
          const endTime = new Date(checkDate.getTime() + duration_minutes * 60000);
          suggestions.push({
            start: checkDate.toISOString(),
            end: endTime.toISOString(),
            day: checkDate.toLocaleDateString('en-US', { weekday: 'long' }),
          });
        }
      }

      return {
        suggestions,
        message: `Found ${suggestions.length} available time slot(s)`,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Create and start Calendar MCP server
 */
export function createCalendarMCPServer() {
  const server = new Server(
    {
      name: 'calendar-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: CALENDAR_TOOLS,
  }));

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const result = await executeCalendarTool(
        request.params.name,
        request.params.arguments || {}
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start MCP server (if run directly)
 */
if (require.main === module) {
  const server = createCalendarMCPServer();
  const transport = new StdioServerTransport();
  server.connect(transport);
  console.log('Calendar MCP Server running on stdio');
}

