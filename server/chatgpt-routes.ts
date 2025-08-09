import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import { storage } from './storage';

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

    // Build comprehensive conversation context with advanced features
    const systemPrompt = `You are ChatGPT, a powerful AI assistant with advanced document editing and mathematical rendering capabilities. You can have natural conversations about any topic while providing intelligent document assistance.

🎯 **CORE CAPABILITIES:**

**💬 Natural Conversation:**
- Answer questions on any topic (science, history, technology, etc.)
- Provide explanations and clarifications
- Help with problem-solving and brainstorming
- Creative writing and storytelling assistance
- General knowledge and research help

**📝 Advanced Document Editing:**
- Natural language document commands
- Real-time content generation and modification
- Intelligent formatting and structure changes
- Context-aware editing that preserves document integrity
- Multi-step document operations

**🧮 Live Mathematical Rendering:**
- Beautiful LaTeX mathematical notation rendering
- Physics notation (vectors, tensors, quantum mechanics)
- Chemistry notation (chemical formulas, equations)
- Engineering notation (technical symbols, formulas)
- Scientific notation (all subject-specific mathematical symbols)
- Real-time equation preservation and enhancement

**🎨 Smart Document Features:**
- Writing improvement and enhancement
- Tone adjustment (professional, academic, casual, formal, creative)
- Content generation with proper formatting
- Structural document changes
- Intelligent error prevention

**📊 Context Awareness:**
- Understands current document content and structure
- Maintains conversation history and context
- Preserves mathematical content and formatting
- Smart suggestions based on document context
- Multi-session document state management

Current document content length: ${documentContent ? documentContent.length : 0} characters

**🔧 DOCUMENT COMMAND SYSTEM:**
When the user requests document modifications, you can use these commands:
- [COMMAND:ADD_TEXT]new content[/COMMAND] - Add text to document
- [COMMAND:REPLACE_TEXT:old_text]new text[/COMMAND] - Replace specific text
- [COMMAND:DELETE_TEXT]text to delete[/COMMAND] - Delete specific text
- [COMMAND:FORMAT_TEXT:text:BOLD/ITALIC/UNDERLINE][/COMMAND] - Format text
- [COMMAND:CENTER_TEXT]text to center[/COMMAND] - Center align text
- [COMMAND:DELETE_LAST_PARAGRAPH][/COMMAND] - Remove last paragraph
- [COMMAND:INSERT_PAGE][/COMMAND] - Add new page
- [COMMAND:CLEAR_ALL][/COMMAND] - Clear entire document

**🧮 MATHEMATICAL RENDERING:**
You can include LaTeX mathematical notation that will be beautifully rendered:
- Physics: \\vec{F} = m\\vec{a}, E = mc^2, \\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\epsilon_0}
- Chemistry: H_2O, CO_2, CH_4 + 2O_2 \\rightarrow CO_2 + 2H_2O
- Engineering: \\sigma = \\frac{F}{A}, P = \\frac{W}{t}, \\tau = F \\times r
- Mathematics: \\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}, \\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}

**🎯 RESPONSE GUIDELINES:**
1. For general questions and conversation: Respond naturally as ChatGPT
2. For document modifications: Use appropriate command markers
3. For mathematical content: Include proper LaTeX notation
4. For writing improvement: Provide enhanced content with formatting
5. Always preserve document structure and mathematical integrity
6. Maintain professional quality and readability

**⚡ SPECIAL FEATURES:**
- Real-time mathematical rendering with KaTeX
- Context-aware document editing
- Intelligent error prevention
- Multi-step operation support
- Session-based document state management
- Equation preservation and enhancement

Remember: You're an intelligent writing partner that can handle both natural conversation and advanced document editing with beautiful mathematical rendering!`;

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

    console.log('Saving user message to session:', sessionId);
    // Save user message to database
    await storage.createChatMessage({
      sessionId: sessionId,
      workspaceId: documentId,
      workspaceType: 'document',
      role: 'user',
      content: content,
      documentCommand: null
    });

    console.log('Saving assistant message to session:', sessionId);
    // Save assistant message to database
    await storage.createChatMessage({
      sessionId: sessionId,
      workspaceId: documentId,
      workspaceType: 'document',
      role: 'assistant',
      content: cleanContent,
      documentCommand: documentCommands.length > 0 ? documentCommands[0] : null
    });

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

// Enhanced document command parsing with mathematical rendering support
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
      const [, oldText, newText] = match.match(/\[COMMAND:REPLACE_TEXT:(.*?)\](.*?)\[\/COMMAND\]/) || [];
      if (oldText && newText) {
        commands.push({
          type: 'replace_text',
          params: { oldText, newText }
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
  const formatMatches = content.match(/\[COMMAND:FORMAT_TEXT:(.*?):(.*?)\]/g);
  if (formatMatches) {
    formatMatches.forEach(match => {
      const [, text, format] = match.match(/\[COMMAND:FORMAT_TEXT:(.*?):(.*?)\]/) || [];
      if (text && format) {
        commands.push({
          type: 'format_text',
          params: { text, format: format.toUpperCase() }
        });
      }
    });
  }

  // Parse CENTER_TEXT commands
  const centerMatches = content.match(/\[COMMAND:CENTER_TEXT\](.*?)\[\/COMMAND\]/g);
  if (centerMatches) {
    centerMatches.forEach(match => {
      const text = match.replace(/\[COMMAND:CENTER_TEXT\]/, '').replace(/\[\/COMMAND\]/, '');
      commands.push({
        type: 'center_text',
        params: { text }
      });
    });
  }

  // Parse DELETE_LAST_PARAGRAPH command
  if (content.includes('[COMMAND:DELETE_LAST_PARAGRAPH]')) {
    commands.push({
      type: 'delete_last_paragraph',
      params: {}
    });
  }

  // Parse INSERT_PAGE command
  if (content.includes('[COMMAND:INSERT_PAGE]')) {
    commands.push({
      type: 'insert_page',
      params: {}
    });
  }

  // Parse CLEAR_ALL command
  if (content.includes('[COMMAND:CLEAR_ALL]')) {
    commands.push({
      type: 'clear_all',
      params: {}
    });
  }



  return commands;
}

export default router;