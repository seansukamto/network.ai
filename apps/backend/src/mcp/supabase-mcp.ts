/**
 * Supabase MCP Server
 * Exposes Supabase database operations as MCP tools for Claude
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { supabaseAdmin } from '../config/supabase';

/**
 * MCP Tool definitions for Supabase operations
 */
const SUPABASE_TOOLS = [
  {
    name: 'get_user_connections',
    description: 'Get all connections (saved contacts) for a user',
    inputSchema: {
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
    inputSchema: {
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
    inputSchema: {
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
    inputSchema: {
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
    inputSchema: {
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
];

/**
 * Execute Supabase MCP tool
 */
async function executeSupabaseTool(name: string, args: any): Promise<any> {
  switch (name) {
    case 'get_user_connections': {
      const { user_id } = args;
      
      const { data, error } = await supabaseAdmin
        .from('connections')
        .select(`
          *,
          connection:connection_id (
            id,
            name,
            email,
            company,
            job_title,
            photo_url,
            interests
          ),
          session:met_at_session_id (
            id,
            name,
            date
          )
        `)
        .eq('user_id', user_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }

    case 'search_connections': {
      const { user_id, query } = args;
      
      const { data, error } = await supabaseAdmin
        .from('connections')
        .select(`
          *,
          connection:connection_id (
            id,
            name,
            email,
            company,
            job_title,
            interests
          )
        `)
        .eq('user_id', user_id)
        .eq('status', 'active')
        .or(`connection.name.ilike.%${query}%,connection.company.ilike.%${query}%,connection.job_title.ilike.%${query}%`);

      if (error) throw error;
      return data;
    }

    case 'get_connection_notes': {
      const { user_id, connection_id } = args;
      
      const { data, error } = await supabaseAdmin
        .from('connection_notes')
        .select('*')
        .eq('user_id', user_id)
        .eq('connection_id', connection_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }

    case 'add_connection_note': {
      const { user_id, connection_id, note_text, note_type } = args;
      
      const { data, error } = await supabaseAdmin
        .from('connection_notes')
        .insert({
          user_id,
          connection_id,
          note_text,
          note_type: note_type || 'general',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    case 'get_network_sessions': {
      const { user_id } = args;
      
      const { data, error } = await supabaseAdmin
        .from('attendance')
        .select(`
          *,
          session:session_id (
            id,
            name,
            description,
            date,
            location
          )
        `)
        .eq('user_id', user_id)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Create and start Supabase MCP server
 */
export function createSupabaseMCPServer() {
  const server = new Server(
    {
      name: 'supabase-mcp-server',
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
    tools: SUPABASE_TOOLS,
  }));

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const result = await executeSupabaseTool(
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
  const server = createSupabaseMCPServer();
  const transport = new StdioServerTransport();
  server.connect(transport);
  console.log('Supabase MCP Server running on stdio');
}

