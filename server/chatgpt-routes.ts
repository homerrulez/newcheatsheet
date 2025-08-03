import express from 'express';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const router = express.Router();

// Real ChatGPT-like conversation route
router.post('/chat-sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content, documentContent, documentId } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Build conversation context with document awareness but natural conversation
    const systemPrompt = `You are ChatGPT, a helpful AI assistant created by OpenAI. You can have natural conversations about any topic, help with writing, answer questions, provide explanations, and assist with various tasks.

You are currently integrated into StudyFlow, a document editing platform. The user is working on a document, and you can help them with:
- Writing and editing content
- Answering questions about any topic
- Providing explanations and clarifications  
- Helping with research and analysis
- Giving feedback and suggestions
- Performing document operations when requested

When the user asks you to modify their document (like "add this to my document", "replace that text", "delete this section", etc.), you can provide specific commands. But most importantly, have natural conversations just like the real ChatGPT.

Current document content length: ${documentContent ? documentContent.length : 0} characters

IMPORTANT: Respond naturally and conversationally. Only provide structured commands when the user explicitly asks you to modify their document. For general questions, explanations, help, or conversation, respond normally as you would on ChatGPT.com.

If the user asks you to modify the document, you can include special markers in your response:
- [COMMAND:ADD_TEXT]text content here[/COMMAND] to add text
- [COMMAND:REPLACE_TEXT:old_text]new text here[/COMMAND] to replace text
- [COMMAND:DELETE_TEXT]text to delete[/COMMAND] to delete text
- [COMMAND:FORMAT_TEXT:text_to_format:BOLD/ITALIC/UNDERLINE][/COMMAND] to format text

But again, only use these when explicitly asked to modify the document. For everything else, just chat naturally.`;

    // Get chat history for this session to maintain conversation context
    // Note: In a real implementation, you'd fetch this from storage
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: content }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: messages,
      temperature: 0.7, // Natural conversation temperature
      max_tokens: 2000,
      // No forced JSON format - let ChatGPT respond naturally
    });

    const aiContent = response.choices[0].message.content || '';

    // Parse any document commands from the response
    const documentCommands = parseDocumentCommands(aiContent);
    
    // Clean the response of command markers for display
    const cleanContent = aiContent
      .replace(/\[COMMAND:.*?\]/g, '')
      .replace(/\[\/COMMAND\]/g, '')
      .trim();

    // Build response in the format expected by the frontend
    const chatResponse = {
      content: cleanContent,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      // Include document commands if any were found
      ...(documentCommands.length > 0 && { documentCommands })
    };

    res.json(chatResponse);
  } catch (error) {
    console.error('ChatGPT API error:', error);
    res.status(500).json({ error: 'Failed to get response from ChatGPT' });
  }
});

// Parse document commands from ChatGPT response
function parseDocumentCommands(content: string): any[] {
  const commands: any[] = [];
  
  // Parse ADD_TEXT commands
  const addMatches = content.match(/\[COMMAND:ADD_TEXT\](.*?)\[\/COMMAND\]/g);
  if (addMatches) {
    addMatches.forEach(match => {
      const text = match.replace(/\[COMMAND:ADD_TEXT\]/, '').replace(/\[\/COMMAND\]/, '');
      commands.push({
        type: 'add_text',
        params: { text, position: 'end' }
      });
    });
  }

  // Parse REPLACE_TEXT commands
  const replaceMatches = content.match(/\[COMMAND:REPLACE_TEXT:(.*?)\](.*?)\[\/COMMAND\]/g);
  if (replaceMatches) {
    replaceMatches.forEach(match => {
      const parts = match.match(/\[COMMAND:REPLACE_TEXT:(.*?)\](.*?)\[\/COMMAND\]/);
      if (parts && parts.length >= 3) {
        commands.push({
          type: 'replace_text',
          params: { targetText: parts[1], newText: parts[2] }
        });
      }
    });
  }

  // Parse DELETE_TEXT commands
  const deleteMatches = content.match(/\[COMMAND:DELETE_TEXT\](.*?)\[\/COMMAND\]/g);
  if (deleteMatches) {
    deleteMatches.forEach(match => {
      const text = match.replace(/\[COMMAND:DELETE_TEXT\]/, '').replace(/\[\/COMMAND\]/, '');
      commands.push({
        type: 'delete_text',
        params: { text }
      });
    });
  }

  // Parse FORMAT_TEXT commands
  const formatMatches = content.match(/\[COMMAND:FORMAT_TEXT:(.*?):(.*?)\]\[\/COMMAND\]/g);
  if (formatMatches) {
    formatMatches.forEach(match => {
      const parts = match.match(/\[COMMAND:FORMAT_TEXT:(.*?):(.*?)\]\[\/COMMAND\]/);
      if (parts && parts.length >= 3) {
        const formatting: any = {};
        const formatType = parts[2].toLowerCase();
        if (formatType.includes('bold')) formatting.bold = true;
        if (formatType.includes('italic')) formatting.italic = true;
        if (formatType.includes('underline')) formatting.underline = true;
        
        commands.push({
          type: 'format_text',
          params: { text: parts[1], formatting }
        });
      }
    });
  }

  return commands;
}

export default router;