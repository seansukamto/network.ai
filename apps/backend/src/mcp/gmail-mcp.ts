/**
 * Gmail MCP Server
 * Exposes Gmail operations as MCP tools for Claude
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';

/**
 * MCP Tool definitions for Gmail operations
 */
const GMAIL_TOOLS = [
  {
    name: 'draft_email',
    description: 'Create a draft email (does not send automatically)',
    inputSchema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: "User's Gmail access token",
        },
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
      required: ['access_token', 'to', 'subject', 'body'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email via Gmail (requires user confirmation in UI)',
    inputSchema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: "User's Gmail access token",
        },
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
      required: ['access_token', 'to', 'subject', 'body'],
    },
  },
];

/**
 * Create email message in base64 format
 */
function createEmailMessage(to: string, subject: string, body: string, fromName?: string): string {
  const messageParts = [
    fromName ? `From: ${fromName}` : '',
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    body,
  ].filter(Boolean);

  const message = messageParts.join('\n');
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Execute Gmail MCP tool
 */
async function executeGmailTool(name: string, args: any): Promise<any> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: args.access_token });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  switch (name) {
    case 'draft_email': {
      const { to, subject, body, from_name } = args;
      
      const raw = createEmailMessage(to, subject, body, from_name);

      const response = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw,
          },
        },
      });

      return {
        success: true,
        draft_id: response.data.id,
        message: 'Draft created successfully',
      };
    }

    case 'send_email': {
      const { to, subject, body, from_name } = args;
      
      const raw = createEmailMessage(to, subject, body, from_name);

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw,
        },
      });

      return {
        success: true,
        message_id: response.data.id,
        message: 'Email sent successfully',
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Create and start Gmail MCP server
 */
export function createGmailMCPServer() {
  const server = new Server(
    {
      name: 'gmail-mcp-server',
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
    tools: GMAIL_TOOLS,
  }));

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const result = await executeGmailTool(
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
  const server = createGmailMCPServer();
  const transport = new StdioServerTransport();
  server.connect(transport);
  console.log('Gmail MCP Server running on stdio');
}

