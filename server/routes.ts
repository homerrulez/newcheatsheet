import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { 
  insertDocumentSchema, 
  insertCheatSheetSchema, 
  insertTemplateSchema,
  insertChatMessageSchema 
} from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export async function registerRoutes(app: Express): Promise<Server> {
  
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

  app.put("/api/documents/:id", async (req, res) => {
    try {
      const updates = req.body;
      const document = await storage.updateDocument(req.params.id, updates);
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to update document" });
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
      const { workspaceId, workspaceType, message } = req.body;
      
      // Store user message
      await storage.createChatMessage({
        workspaceId,
        workspaceType,
        role: "user",
        content: message
      });

      // Get AI response
      const systemPrompt = getSystemPrompt(workspaceType);
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
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

function getSystemPrompt(workspaceType: string): string {
  switch (workspaceType) {
    case "document":
      return `You are an AI assistant helping with document editing. When users ask questions, provide responses that can be formatted with LaTeX for mathematical content. Always respond in JSON format with fields: "content" (the main response), "latex" (any LaTeX formulas), and "formatting" (how to insert into document). Focus on academic and educational content.`;
    
    case "cheatsheet":
      return `You are an AI assistant for cheat sheet management. Handle these types of requests:

1. CREATING NEW BOXES: When users request formulas/content, provide EXACTLY the number requested.
   Respond with JSON: {"boxes": [...]}
   
2. MODIFYING EXISTING BOXES: When users say "change box 17..." or "modify box 5...", respond with:
   {"action": "modify", "boxNumber": 17, "title": "New Title", "content": "New content"}
   
3. DELETING BOXES: When users say "delete box 3" or "remove box 12", respond with:
   {"action": "delete", "boxNumber": 3}

For new boxes, each should have:
- "title": Clear, descriptive name
- "content": LaTeX formulas or any text content (auto-fits to content size)
- "color": One of: "from-blue-50 to-indigo-50 border-blue-200", "from-green-50 to-emerald-50 border-green-200", "from-purple-50 to-violet-50 border-purple-200", "from-orange-50 to-red-50 border-orange-200", "from-teal-50 to-cyan-50 border-teal-200", "from-pink-50 to-rose-50 border-pink-200"

All boxes are numbered (1, 2, 3...) for easy reference. Content auto-fits to size whether it's math, text, diary entries, or anything else.

LaTeX examples:
- "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
- "\\int_{a}^{b} f(x) dx"
- "\\sum_{i=1}^{n} x_i"`;
    
    case "template":
      return `You are an AI assistant filling template sections. Users will ask you to fill specific sections of a structured template. Respond in JSON format with "sections" object where keys are section names and values have "title", "content" (with LaTeX), and "status". Focus on the most essential and fundamental formulas for each topic that fit in compact spaces.`;
    
    default:
      return `You are a helpful AI assistant. Respond in JSON format with appropriate fields for the context.`;
  }
}
