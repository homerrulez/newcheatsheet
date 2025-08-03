import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import aiRoutes from "./ai-routes";
import { 
  insertDocumentSchema, 
  insertCheatSheetSchema, 
  insertTemplateSchema,
  insertChatMessageSchema,
  insertChatSessionSchema,
  insertDocumentHistorySchema
} from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // AI Writing Assistant Routes
  app.use("/api/ai", aiRoutes);
  
  // Documents API
  app.get("/api/documents", async (req, res) => {
    try {
      // For now, use a default user ID since we don't have auth implemented
      const userId = "default-user";
      const documents = await storage.getDocumentsByUser(userId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument({
        ...validatedData,
        userId: "default-user"
      });
      res.json(document);
    } catch (error) {
      res.status(400).json({ message: "Invalid document data" });
    }
  });

  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const updates = req.body;
      const document = await storage.updateDocument(req.params.id, updates);
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // Document History API
  app.get("/api/documents/:id/history", async (req, res) => {
    try {
      const history = await storage.getDocumentHistory(req.params.id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document history" });
    }
  });

  app.post("/api/documents/:id/history", async (req, res) => {
    try {
      const validatedData = insertDocumentHistorySchema.parse(req.body);
      const history = await storage.createDocumentHistory({
        ...validatedData,
        documentId: req.params.id
      });
      res.json(history);
    } catch (error) {
      res.status(400).json({ message: "Invalid document history data" });
    }
  });

  // Chat Sessions API
  app.get("/api/documents/:id/chat-sessions", async (req, res) => {
    try {
      const sessions = await storage.getChatSessions(req.params.id);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat sessions" });
    }
  });

  app.post("/api/documents/:id/chat-sessions", async (req, res) => {
    try {
      const validatedData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession({
        ...validatedData,
        documentId: req.params.id
      } as any);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Invalid chat session data" });
    }
  });

  app.patch("/api/chat-sessions/:id", async (req, res) => {
    try {
      const updates = req.body;
      const session = await storage.updateChatSession(req.params.id, updates);
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update chat session" });
    }
  });

  app.delete("/api/chat-sessions/:id", async (req, res) => {
    try {
      await storage.deleteChatSession(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete chat session" });
    }
  });

  // Chat Messages API for sessions
  app.get("/api/chat-sessions/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessagesBySession(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat-sessions/:id/messages", async (req, res) => {
    try {
      const { content, documentContent, documentId } = req.body;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ message: "OpenAI API key not configured" });
      }

      // Enhanced natural language system prompt
      const systemPrompt = `You are an intelligent writing assistant for a document editor. You help users in two distinct ways:

1. CONTENT CREATION: When users ask to create/write/add content, respond with ONLY the pure content
2. DOCUMENT COMMANDS: When users ask to format/edit existing text, use command syntax

CONTENT CREATION (respond with content only, no commands):
- "create a title about Ali and make it adventurous" → "The Epic Adventures of Ali"
- "write a paragraph about nature" → "Nature provides sanctuary and peace..."
- "add a conclusion" → "In conclusion, this demonstrates..."

DOCUMENT COMMANDS (use exact syntax):
- "center the title" → CENTER_TEXT "The Epic Adventures of Ali"
- "make the title bold" → FORMAT_TEXT "The Epic Adventures of Ali" BOLD
- "italicize this word" → FORMAT_TEXT "word" ITALIC

CRITICAL INTELLIGENCE:
1. "create X" = content creation (respond with pure content)
2. "format/center/bold X" = command execution (respond with command only)
3. NEVER mix content and commands in one response
4. NEVER add explanatory text or commands when creating content

Current document: ${documentContent}

User request: ${content}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const responseContent = completion.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
      
      // Parse document commands from response
      let documentCommand = null;
      let insertText = null;
      let insertAtEnd = false;

      // Enhanced command parsing for natural language
      if (responseContent.includes('DELETE_PAGE')) {
        const pageMatch = responseContent.match(/DELETE_PAGE (\d+)/);
        if (pageMatch) {
          documentCommand = {
            type: 'delete_page',
            params: { pageNumber: parseInt(pageMatch[1]) }
          };
        }
      } else if (responseContent.includes('CENTER_TEXT')) {
        const centerMatch = responseContent.match(/CENTER_TEXT "([^"]+)"/);
        if (centerMatch) {
          documentCommand = {
            type: 'center_text',
            params: { text: centerMatch[1] }
          };
        }
      } else if (responseContent.includes('FORMAT_TEXT')) {
        const formatMatch = responseContent.match(/FORMAT_TEXT "([^"]+)" (BOLD|ITALIC|UNDERLINE)/);
        if (formatMatch) {
          documentCommand = {
            type: 'format_text',
            params: {
              text: formatMatch[1],
              formatting: { [formatMatch[2].toLowerCase()]: true }
            }
          };
        }
      } else if (responseContent.includes('ADD_TEXT')) {
        const addMatch = responseContent.match(/ADD_TEXT "([^"]+)" TO (PAGE \d+|START|END)/);
        if (addMatch) {
          documentCommand = {
            type: 'add_text',
            params: {
              text: addMatch[1],
              position: addMatch[2].toLowerCase(),
              pageNumber: addMatch[2].includes('PAGE') ? parseInt(addMatch[2].split(' ')[1]) : undefined
            }
          };
        }
      } else if (responseContent.includes('REPLACE_TEXT')) {
        const replaceMatch = responseContent.match(/REPLACE_TEXT "([^"]+)" WITH "([^"]+)"/);
        if (replaceMatch) {
          documentCommand = {
            type: 'replace_text',
            params: {
              targetText: replaceMatch[1],
              newText: replaceMatch[2]
            }
          };
        }
      }

      // Enhanced content detection for natural language responses
      if (!documentCommand) {
        // Check if response is pure content (not conversational)
        const isConversational = responseContent.match(/\b(I am|I'll|I will|I can|I would|Let me|Here's|This is)\b/i);
        const isShortContent = responseContent.length > 3 && responseContent.length < 200;
        const isLikelyContent = !isConversational && (
          isShortContent || 
          responseContent.startsWith('"') || 
          /^[A-Z][^.!?]*$/.test(responseContent.trim()) || // Title-like format
          responseContent.split('\n').length <= 3 // Short paragraph format
        );
        
        if (isLikelyContent) {
          // Clean up any residual quotes
          insertText = responseContent.replace(/^["']|["']$/g, '').trim();
          insertAtEnd = true;
        }
      }

      // Save user message
      await storage.createChatMessage({
        sessionId: req.params.id,
        workspaceId: documentId,
        workspaceType: 'document',
        role: 'user',
        content,
        documentCommand: null
      });

      // Save assistant message
      await storage.createChatMessage({
        sessionId: req.params.id,
        workspaceId: documentId,
        workspaceType: 'document',
        role: 'assistant',
        content: responseContent,
        documentCommand
      });

      res.json({ 
        content: responseContent, 
        documentCommand,
        insertText,
        insertAtEnd
      });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ message: "Failed to process chat request" });
    }
  });

  // AI Chat API for documents
  app.post("/api/chat/document", async (req, res) => {
    try {
      const { message, documentContent, documentId } = req.body;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ message: "OpenAI API key not configured" });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a helpful writing assistant for a document editor. Help users improve their documents, write content, format text, and answer questions about writing. Keep responses concise and focused on the user's request. When generating content, provide it in a way that can be directly inserted into the document."
          },
          {
            role: "user",
            content: `Current document content: ${documentContent}\n\nUser request: ${message}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
      
      // Save the chat message
      await storage.createChatMessage({
        workspaceId: documentId,
        workspaceType: 'document',
        role: 'user',
        content: message,
      });

      await storage.createChatMessage({
        workspaceId: documentId,
        workspaceType: 'document',
        role: 'assistant',
        content,
      });

      res.json({ content });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ message: "Failed to process chat request" });
    }
  });

  // CheatSheets API
  app.get("/api/cheatsheets", async (req, res) => {
    try {
      const userId = "default-user";
      const cheatSheets = await storage.getCheatSheetsByUser(userId);
      res.json(cheatSheets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cheat sheets" });
    }
  });

  app.get("/api/cheatsheets/:id", async (req, res) => {
    try {
      const cheatSheet = await storage.getCheatSheet(req.params.id);
      if (!cheatSheet) {
        return res.status(404).json({ message: "Cheat sheet not found" });
      }
      res.json(cheatSheet);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cheat sheet" });
    }
  });

  app.post("/api/cheatsheets", async (req, res) => {
    try {
      const validatedData = insertCheatSheetSchema.parse(req.body);
      const cheatSheet = await storage.createCheatSheet({
        ...validatedData,
        userId: "default-user"
      });
      res.json(cheatSheet);
    } catch (error) {
      res.status(400).json({ message: "Invalid cheat sheet data" });
    }
  });

  app.put("/api/cheatsheets/:id", async (req, res) => {
    try {
      const updates = req.body;
      const cheatSheet = await storage.updateCheatSheet(req.params.id, updates);
      res.json(cheatSheet);
    } catch (error) {
      res.status(500).json({ message: "Failed to update cheat sheet" });
    }
  });

  // Templates API
  app.get("/api/templates", async (req, res) => {
    try {
      const userId = "default-user";
      const templates = await storage.getTemplatesByUser(userId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const validatedData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate({
        ...validatedData,
        userId: "default-user"
      });
      res.json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid template data" });
    }
  });

  app.put("/api/templates/:id", async (req, res) => {
    try {
      const updates = req.body;
      const template = await storage.updateTemplate(req.params.id, updates);
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  // Chat API
  app.get("/api/chat/:workspaceType/:workspaceId", async (req, res) => {
    try {
      const { workspaceType, workspaceId } = req.params;
      const messages = await storage.getChatMessages(workspaceId, workspaceType);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { workspaceId, workspaceType, message, currentBoxes } = req.body;
      
      // Store user message
      await storage.createChatMessage({
        workspaceId,
        workspaceType,
        role: "user",
        content: message
      });

      // Get AI response with box context
      const systemPrompt = getSystemPrompt(workspaceType, currentBoxes);
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        response_format: { type: "json_object" }
      });

      const aiResponse = JSON.parse(response.choices[0].message.content || "{}");
      
      // Store AI response
      await storage.createChatMessage({
        workspaceId,
        workspaceType,
        role: "assistant",
        content: JSON.stringify(aiResponse)
      });

      res.json(aiResponse);
    } catch (error) {
      console.error("Chat API error:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function getSystemPrompt(workspaceType: string, currentBoxes?: any[]): string {
  switch (workspaceType) {
    case "document":
      return `You are an AI assistant helping with document editing. When users ask questions, provide responses that can be formatted with LaTeX for mathematical content. Always respond in valid JSON format with fields: "content" (the main response), "latex" (any LaTeX formulas), and "formatting" (how to insert into document). Focus on academic and educational content. Your response must be valid JSON.`;
    
    case "cheatsheet":
      const boxContext = currentBoxes && currentBoxes.length > 0 
        ? `\n\nCURRENT BOXES ON SHEET:\n${currentBoxes.map((box: any, index: number) => 
            `Box ${index + 1}: "${box.title}" - ${box.content.substring(0, 50)}${box.content.length > 50 ? '...' : ''}`
          ).join('\n')}`
        : '\n\nNo boxes currently on the sheet.';
      
      return `You are a versatile Content Assistant for cheat sheet management. You can create ANY TYPE of educational content (math formulas, text, nursery rhymes, poems, study notes, facts, etc.) OR perform operations on existing numbered boxes. Always respond in valid JSON format.${boxContext}

CREATING NEW CONTENT:
When users request ANY content (formulas, nursery rhymes, poems, study notes, etc.), respond with JSON containing "boxes" array format:
- "title": Clear, descriptive name for the content
- "content": The actual content (LaTeX for math, plain text for everything else)
- "color": One of: "from-blue-50 to-indigo-50 border-blue-200", "from-green-50 to-emerald-50 border-green-200", "from-purple-50 to-violet-50 border-purple-200", "from-orange-50 to-red-50 border-orange-200", "from-teal-50 to-cyan-50 border-teal-200", "from-pink-50 to-rose-50 border-pink-200"
- IMPORTANT: When user asks for N items, provide exactly N boxes in the array

BOX OPERATIONS (use when users reference specific box numbers):
For operations like "delete box 3", "edit box 5", "replace box 2 content", respond with JSON containing "operations" array:
- "type": "delete" | "edit" | "replace"
- "boxNumber": the numbered box (1, 2, 3, etc.)
- "title": new title (for edit/replace operations)
- "content": new content (for edit/replace operations)

JSON Examples:
- "Delete box 3" → {"operations": [{"type": "delete", "boxNumber": "3"}]}
- "Replace box 2 with Newton's law" → {"operations": [{"type": "replace", "boxNumber": "2", "title": "Newton's Second Law", "content": "F = ma"}]}
- "Edit box 5 to include momentum" → {"operations": [{"type": "edit", "boxNumber": "5", "content": "p = mv"}]}

CONTENT GUIDELINES:

For MATHEMATICAL FORMULAS:
- Use SIMPLE LaTeX mathematical notation that KaTeX can render
- Good examples: "F = ma", "E = mc^2", "\\frac{d}{dx}x^n = nx^{n-1}"
- NEVER include units in formulas - NO \\text{N}, \\text{J}, \\text{V}, etc.
- DO NOT add unit annotations like ", (N)" or "\\, (\\text{J})" after formulas
- AVOID complex vector calculus notation like \\nabla \\cdot, \\nabla \\times
- For vector operations, use simple text like "div F", "curl F", "grad f"  
- DO NOT use \\left( \\right), \\vec{}, or complex delimiters
- NEVER use \\text{}, \\mathrm{}, or any text commands
- Keep formulas clean without unit labels - just the mathematical relationship

For TEXT CONTENT (nursery rhymes, poems, notes, facts, etc.):
- Use plain text with proper spacing and line breaks
- Make content engaging and educational
- Include appropriate formatting for readability
- No LaTeX formatting needed for regular text
- Examples: nursery rhymes, study notes, historical facts, poems, quotes
- When user requests N items, provide exactly N boxes

Always return valid JSON response.`;
    
    case "template":
      return `You are an AI assistant filling template sections. Users will ask you to fill specific sections of a structured template. Always respond in valid JSON format with "sections" object where keys are section names and values have "title", "content" (with LaTeX), and "status". Focus on the most essential and fundamental formulas for each topic that fit in compact spaces. Your response must be valid JSON.`;
    
    default:
      return `You are a helpful AI assistant. Always respond in valid JSON format with appropriate fields for the context. Your response must be valid JSON.`;
  }
}
