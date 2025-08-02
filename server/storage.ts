import { 
  type User, 
  type InsertUser, 
  type Document, 
  type InsertDocument,
  type DocumentHistory,
  type InsertDocumentHistory,
  type CheatSheet,
  type InsertCheatSheet,
  type Template,
  type InsertTemplate,
  type ChatMessage,
  type InsertChatMessage
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Document methods
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByUser(userId: string): Promise<Document[]>;
  createDocument(document: InsertDocument & { userId: string }): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document>;
  
  // Document History methods
  getDocumentHistory(documentId: string): Promise<DocumentHistory[]>;
  createDocumentHistory(history: InsertDocumentHistory): Promise<DocumentHistory>;
  
  // CheatSheet methods
  getCheatSheet(id: string): Promise<CheatSheet | undefined>;
  getCheatSheetsByUser(userId: string): Promise<CheatSheet[]>;
  createCheatSheet(cheatSheet: InsertCheatSheet & { userId: string }): Promise<CheatSheet>;
  updateCheatSheet(id: string, updates: Partial<CheatSheet>): Promise<CheatSheet>;
  
  // Template methods
  getTemplate(id: string): Promise<Template | undefined>;
  getTemplatesByUser(userId: string): Promise<Template[]>;
  createTemplate(template: InsertTemplate & { userId: string }): Promise<Template>;
  updateTemplate(id: string, updates: Partial<Template>): Promise<Template>;
  
  // Chat methods
  getChatMessages(workspaceId: string, workspaceType: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private documents: Map<string, Document>;
  private documentHistory: Map<string, DocumentHistory>;
  private cheatSheets: Map<string, CheatSheet>;
  private templates: Map<string, Template>;
  private chatMessages: Map<string, ChatMessage>;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.documentHistory = new Map();
    this.cheatSheets = new Map();
    this.templates = new Map();
    this.chatMessages = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.userId === userId);
  }

  async createDocument(document: InsertDocument & { userId: string }): Promise<Document> {
    const id = randomUUID();
    const now = new Date();
    const newDocument: Document = { 
      ...document,
      content: document.content || "",
      pages: document.pages || [],
      pageSize: document.pageSize || "letter",
      fontSize: document.fontSize || "12",
      fontFamily: document.fontFamily || "Times New Roman",
      textColor: document.textColor || "#000000",
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.documents.set(id, newDocument);
    return newDocument;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const existing = this.documents.get(id);
    if (!existing) throw new Error('Document not found');
    
    const updated: Document = { 
      ...existing, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.documents.set(id, updated);
    return updated;
  }

  async getCheatSheet(id: string): Promise<CheatSheet | undefined> {
    return this.cheatSheets.get(id);
  }

  async getCheatSheetsByUser(userId: string): Promise<CheatSheet[]> {
    return Array.from(this.cheatSheets.values()).filter(sheet => sheet.userId === userId);
  }

  async createCheatSheet(cheatSheet: InsertCheatSheet & { userId: string }): Promise<CheatSheet> {
    const id = randomUUID();
    const now = new Date();
    const newCheatSheet: CheatSheet = { 
      ...cheatSheet,
      boxes: cheatSheet.boxes || [],
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.cheatSheets.set(id, newCheatSheet);
    return newCheatSheet;
  }

  async updateCheatSheet(id: string, updates: Partial<CheatSheet>): Promise<CheatSheet> {
    const existing = this.cheatSheets.get(id);
    if (!existing) throw new Error('CheatSheet not found');
    
    const updated: CheatSheet = { 
      ...existing, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.cheatSheets.set(id, updated);
    return updated;
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async getTemplatesByUser(userId: string): Promise<Template[]> {
    return Array.from(this.templates.values()).filter(template => template.userId === userId);
  }

  async createTemplate(template: InsertTemplate & { userId: string }): Promise<Template> {
    const id = randomUUID();
    const now = new Date();
    const newTemplate: Template = { 
      ...template,
      sections: template.sections || {},
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template> {
    const existing = this.templates.get(id);
    if (!existing) throw new Error('Template not found');
    
    const updated: Template = { 
      ...existing, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.templates.set(id, updated);
    return updated;
  }

  async getChatMessages(workspaceId: string, workspaceType: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(msg => msg.workspaceId === workspaceId && msg.workspaceType === workspaceType)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const now = new Date();
    const newMessage: ChatMessage = { 
      ...message, 
      id, 
      createdAt: now 
    };
    this.chatMessages.set(id, newMessage);
    return newMessage;
  }

  async getDocumentHistory(documentId: string): Promise<DocumentHistory[]> {
    return Array.from(this.documentHistory.values())
      .filter(history => history.documentId === documentId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createDocumentHistory(history: InsertDocumentHistory): Promise<DocumentHistory> {
    const id = randomUUID();
    const now = new Date();
    const newHistory: DocumentHistory = { 
      ...history,
      pages: history.pages || [],
      changeDescription: history.changeDescription || null,
      id, 
      createdAt: now 
    };
    this.documentHistory.set(id, newHistory);
    return newHistory;
  }
}

export const storage = new MemStorage();
