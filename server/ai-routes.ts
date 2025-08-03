import express from 'express';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const router = express.Router();

// AI Writing Improvement Route
router.post('/improve-writing', async (req, res) => {
  try {
    const { content, preserveEquations = true, preserveNotations = true } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const systemPrompt = `You are an intelligent writing assistant that makes text better while keeping everything well-organized and properly formatted.

INTELLIGENT IMPROVEMENT APPROACH:
- Fix grammar, spelling, and awkward phrasing naturally
- Enhance clarity and flow without changing the author's voice
- Improve word choice and sentence structure thoughtfully
- Maintain professional tone and readability
- Preserve all existing formatting (headings, paragraphs, bold, italic, etc.)
- Keep the document structure intact (separate paragraphs stay separate)
- Respect the author's intended organization and layout
${preserveEquations ? '- Keep all mathematical content exactly as written' : ''}
${preserveNotations ? '- Preserve technical terminology and scientific notations' : ''}

SMART BEHAVIOR:
- Never merge well-structured paragraphs into a blob
- Never remove intentional formatting or structure
- Never change technical terms or proper nouns unnecessarily  
- Never alter the fundamental meaning or style
- Always maintain the document's visual organization

Your goal is to make the writing cleaner, clearer, and more polished while respecting how the author organized their content.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content }
      ],
      temperature: 0.3, // Lower temperature for consistent, focused improvements
    });

    const improvedContent = response.choices[0].message.content;

    res.json({ improvedContent });
  } catch (error) {
    console.error('AI improve writing error:', error);
    res.status(500).json({ error: 'Failed to improve writing' });
  }
});

// AI Tone Adjustment Route
router.post('/adjust-tone', async (req, res) => {
  try {
    const { content, targetTone = 'professional', preserveEquations = true } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const toneInstructions = {
      professional: 'formal, clear, and authoritative while maintaining readability',
      academic: 'scholarly, precise, and objective with appropriate academic language',
      casual: 'conversational, friendly, and approachable while remaining clear',
      formal: 'highly formal, structured, and ceremonious language',
      creative: 'engaging, expressive, and imaginative while staying coherent'
    };

    const systemPrompt = `You are an intelligent writing assistant that adjusts tone while preserving content quality and organization.

TONE TARGET: Make the text ${toneInstructions[targetTone as keyof typeof toneInstructions] || toneInstructions.professional}.

SMART TONE ADJUSTMENT:
- Modify word choice and phrasing to match the target tone
- Adjust sentence structure and complexity appropriately
- Maintain the author's intended meaning and key points
- Preserve document structure and paragraph organization
- Keep all formatting (headings, lists, emphasis) intact
${preserveEquations ? '- Keep mathematical content exactly as written' : ''}
- Respect technical terms and proper terminology

INTELLIGENT BEHAVIOR:
- Never flatten well-structured content
- Never remove intentional formatting
- Never change factual information or core concepts
- Always maintain logical flow and readability

Adjust the tone thoughtfully while keeping the content well-organized and professionally presented.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content }
      ],
      temperature: 0.4, // Slightly higher for tone variation while maintaining consistency
    });

    const adjustedContent = response.choices[0].message.content;

    res.json({ adjustedContent });
  } catch (error) {
    console.error('AI tone adjustment error:', error);
    res.status(500).json({ error: 'Failed to adjust tone' });
  }
});

export default router;