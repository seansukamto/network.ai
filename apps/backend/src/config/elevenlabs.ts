import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel voice

/**
 * Convert text to speech using ElevenLabs
 * @param text - Text to convert to speech
 * @param voiceId - Optional voice ID (defaults to env variable)
 * @returns Audio buffer
 */
export const textToSpeech = async (
  text: string,
  voiceId: string = ELEVENLABS_VOICE_ID
): Promise<Buffer> => {
  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
};

/**
 * Get available voices
 */
export const getVoices = async () => {
  try {
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    return response.data.voices;
  } catch (error) {
    console.error('Error fetching voices:', error);
    throw error;
  }
};

/**
 * Speech-to-text is typically handled by browser's Web Speech API
 * or OpenAI Whisper. ElevenLabs focuses on TTS.
 * For STT, we'll use Web Speech API on the frontend or OpenAI Whisper here.
 */
export const speechToText = async (audioBuffer: Buffer): Promise<string> => {
  // Note: ElevenLabs doesn't provide STT. We'll use OpenAI Whisper for this.
  const openai = await import('./openai');
  
  try {
    // Create a temporary file-like object
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
    
    const response = await openai.openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
    });

    return response.text;
  } catch (error) {
    console.error('Error transcribing speech:', error);
    throw error;
  }
};

