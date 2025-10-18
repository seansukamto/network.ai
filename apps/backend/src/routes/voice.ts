import { Router, Request, Response } from 'express';
import { textToSpeech, speechToText, getVoices } from '../config/elevenlabs';
import { requireAuth } from './profile';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/voice/tts
 * Convert text to speech
 */
router.post('/tts', requireAuth, async (req: Request, res: Response) => {
  try {
    const { text, voice_id } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioBuffer = await textToSpeech(text, voice_id);

    // Send audio as base64
    res.json({
      audio: audioBuffer.toString('base64'),
      format: 'mp3',
    });
  } catch (error: any) {
    console.error('Error in text-to-speech:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

/**
 * POST /api/voice/stt
 * Convert speech to text (using OpenAI Whisper)
 */
router.post('/stt', requireAuth, upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const text = await speechToText(file.buffer);

    res.json({
      text,
    });
  } catch (error: any) {
    console.error('Error in speech-to-text:', error);
    res.status(500).json({ error: 'Failed to transcribe speech' });
  }
});

/**
 * GET /api/voice/voices
 * Get available voices
 */
router.get('/voices', async (req: Request, res: Response) => {
  try {
    const voices = await getVoices();
    res.json(voices);
  } catch (error: any) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

export default router;

