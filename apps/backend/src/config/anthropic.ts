import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Anthropic client instance for Claude AI
 * NOTE: Not currently in use - app switched to OpenAI GPT-4o-mini
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
}) as any;

/**
 * Generate a chat completion using Claude
 * @param messages - Array of messages
 * @param tools - Optional MCP tools
 * @param systemPrompt - Optional system prompt
 * @returns Claude's response
 */
export const generateChatCompletion = async (
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: {
    tools?: any[];
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }
) => {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature || 0.7,
      system: options?.systemPrompt || undefined,
      messages: messages,
      tools: options?.tools || undefined,
    });

    return response;
  } catch (error) {
    console.error('Error generating Claude completion:', error);
    throw error;
  }
};

/**
 * Simple text generation helper
 */
export const generateText = async (
  prompt: string,
  systemPrompt?: string,
  temperature: number = 0.7
): Promise<string> => {
  const response = await generateChatCompletion(
    [{ role: 'user', content: prompt }],
    {
      systemPrompt,
      temperature,
    }
  );

  const textContent = response.content.find((block: any) => block.type === 'text');
  return textContent && 'text' in textContent ? textContent.text : '';
};

