import express from 'express';
import { runAnkaraChat } from '../services/ankaraChatService';

const router = express.Router();

/**
 * POST /api/chat
 * Body: { messages: { role: 'user'|'assistant', content: string }[], context?: { userAddress?, contractAddress? } }
 */
router.post('/', async (req, res) => {
  try {
    const { messages, context } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'messages (non-empty array) is required',
      });
    }
    for (const m of messages) {
      if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Each message must have role user|assistant and string content',
        });
      }
    }

    const result = await runAnkaraChat({
      messages,
      context: context && typeof context === 'object' ? context : undefined,
    });

    res.json({
      success: true,
      data: {
        reply: result.reply,
        actions: result.actions,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Chat failed';
    console.error('Chat route error:', error);
    const status =
      message.includes('OPENAI_API_KEY') || message.includes('not configured') ? 503 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;
