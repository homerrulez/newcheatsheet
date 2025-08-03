import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  pages: jsonb("pages").notNull().default([]),
  pageSize: text("page_size").notNull().default("letter"),
  fontSize: text("font_size").notNull().default("12"),
  fontFamily: text("font_family").notNull().default("Times New Roman"),
  textColor: text("text_color").notNull().default("#000000"),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documentHistory = pgTable("document_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  pages: jsonb("pages").notNull().default([]),
  changeDescription: text("change_description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id).notNull(),
  title: text("title").notNull(),
  documentSnapshot: text("document_snapshot").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cheatSheets = pgTable("cheat_sheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  boxes: jsonb("boxes").notNull().default([]),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  templateType: text("template_type").notNull(),
  sections: jsonb("sections").notNull().default({}),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => chatSessions.id),
  workspaceId: varchar("workspace_id").notNull(),
  workspaceType: text("workspace_type").notNull(), // 'document', 'cheatsheet', 'template'
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  documentCommand: jsonb("document_command"), // For storing parsed document commands
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  title: true,
  content: true,
  pages: true,
  pageSize: true,
  fontSize: true,
  fontFamily: true,
  textColor: true,
});

export const insertDocumentHistorySchema = createInsertSchema(documentHistory).pick({
  documentId: true,
  title: true,
  content: true,
  pages: true,
  changeDescription: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).pick({
  title: true,
  documentSnapshot: true,
});

export const insertCheatSheetSchema = createInsertSchema(cheatSheets).pick({
  title: true,
  boxes: true,
});

export const insertTemplateSchema = createInsertSchema(templates).pick({
  title: true,
  templateType: true,
  sections: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  sessionId: true,
  workspaceId: true,
  workspaceType: true,
  role: true,
  content: true,
  documentCommand: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type DocumentHistory = typeof documentHistory.$inferSelect;
export type InsertDocumentHistory = z.infer<typeof insertDocumentHistorySchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type CheatSheet = typeof cheatSheets.$inferSelect;
export type InsertCheatSheet = z.infer<typeof insertCheatSheetSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Additional types for complex data structures
export type DocumentPage = {
  id: string;
  content: string;
  pageNumber: number;
};

export type CheatSheetBox = {
  id: string;
  title: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
};

export type TemplateSection = {
  id: string;
  title: string;
  content: string;
  status: 'empty' | 'filling' | 'complete';
  position: { row: number; col: number };
};

export type DocumentCommand = {
  type: 'delete_page' | 'format_text' | 'add_text' | 'insert_page' | 'replace_text' | 'center_text' | 'delete_text' | 'clear_all';
  params: {
    pageNumber?: number;
    text?: string;
    formatting?: { bold?: boolean; italic?: boolean; underline?: boolean };
    position?: 'start' | 'end' | 'before' | 'after';
    targetText?: string;
    newText?: string;
  };
};
