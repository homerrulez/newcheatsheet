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

    const systemPrompt = `You are an expert writing assistant that improves text while PRESERVING ALL FORMATTING AND STRUCTURE.

CRITICAL PRESERVATION RULES:
1. PRESERVE ALL HTML STRUCTURE - Keep all <h1>, <h2>, <h3>, <p>, <strong>, <em>, <u> tags EXACTLY as they are
2. PRESERVE PARAGRAPH BREAKS - If input has multiple paragraphs, output MUST have the same paragraph structure
3. PRESERVE FORMATTING - Keep bold, italic, underline, and heading formatting intact
4. NEVER merge separate paragraphs into one blob
5. NEVER remove HTML tags or flatten the content
${preserveEquations ? '6. PRESERVE mathematical equations, formulas, and LaTeX notation exactly as written' : ''}
${preserveNotations ? '7. PRESERVE all scientific notations, symbols, and technical terminology' : ''}

ONLY IMPROVE:
- Grammar and spelling errors
- Sentence flow and clarity
- Word choice and vocabulary
- Professional tone
- Punctuation

STRUCTURE PRESERVATION EXAMPLE:
Input: "<h1>Title</h1><p>First paragraph.</p><p>Second paragraph.</p>"
Output: "<h1>Improved Title</h1><p>Enhanced first paragraph.</p><p>Enhanced second paragraph.</p>"

Return only the improved text with ALL original formatting preserved.`;

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

    const systemPrompt = `You are an expert writing assistant. Adjust the tone of the following text to be ${toneInstructions[targetTone as keyof typeof toneInstructions] || toneInstructions.professional}.

CRITICAL REQUIREMENTS:
${preserveEquations ? '- NEVER modify mathematical equations, formulas, or LaTeX notation - keep them exactly as written' : ''}
- Preserve all technical terminology and scientific notations
- Maintain the original meaning and factual content
- Keep the document structure intact
- Preserve any citations or references

Focus ONLY on adjusting:
- Word choice and vocabulary level
- Sentence structure and complexity
- Overall writing style and voice
- Formality level

Return only the tone-adjusted text without any explanations.`;

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