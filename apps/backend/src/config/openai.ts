import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * OpenAI client instance
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embeddings for text using OpenAI
 * @param text - Text to embed
 * @returns Embedding vector
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

/**
 * Generate a chat completion using GPT-4o-mini
 * @param messages - Array of messages
 * @param options - Optional configuration
 * @returns OpenAI's response
 */
export const generateChatCompletion = async (
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json_object';
  }
) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      response_format: options?.responseFormat === 'json_object' 
        ? { type: 'json_object' } 
        : undefined,
    });

    return response;
  } catch (error) {
    console.error('Error generating GPT completion:', error);
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
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push({ role: 'user', content: prompt });

  const response = await generateChatCompletion(messages, { temperature });

  return response.choices[0]?.message?.content || '';
};

