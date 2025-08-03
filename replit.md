# replit.md

## Overview
StudyFlow is a full-stack web application designed as an academic productivity platform, offering document editing with LaTeX support, interactive cheat sheets, and customizable templates. It features AI-powered assistance through OpenAI integration and real-time collaboration. The project aims to provide a professional, Microsoft Word-level document workspace, enabling users to edit documents naturally while AI provides instant assistance and document control.

## User Preferences
Preferred communication style: Simple, everyday language.
AI Features: User expects AI assist features to be intuitive and intelligent by default - should improve content without explicit instructions about preserving structure or formatting. AI should naturally avoid making content worse.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Radix UI components with Tailwind CSS styling
- **Styling**: Tailwind CSS with CSS variables for theming, featuring a site-wide pastel gradient background.
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API with conventional routes
- **Middleware**: Custom logging, JSON parsing, error handling

### Database & ORM
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with Drizzle Kit for migrations
- **Schema**: Shared schema definitions between client and server
- **Validation**: Zod schemas for runtime type validation

### Core Features
- **Workspace Types**: Document Workspace (rich text with LaTeX), Cheat Sheet Workspace (grid-based, customizable boxes with intelligent auto-sizing and auto-fitting layout), Template Workspace (structured templates).
- **AI Chat Integration**: OpenAI-powered assistance contextual to each workspace, integrated with natural language understanding for commands and content generation, critical fix applied for intelligent command execution without polluting documents. ChatGPT interface always visible and accessible in the right panel.
- **Document Workspace Enhancements**: Professional three-panel Microsoft Word-like interface with left panel for chat history, center panel for true pagination (Letter, Legal, A4, etc., with dynamic page count and visual indicators), and right panel for ChatGPT and document controls. Features include full formatting toolbar, zoom controls, auto-save, and document properties.
- **LaTeX Rendering**: Dynamic mathematical notation rendering via KaTeX, with enhanced preprocessing to handle problematic LaTeX syntax and unit annotations.
- **Real-time Collaboration**: Shared workspaces with chat history.
- **Box Management**: Sequential box numbering for ChatGPT reference and manipulation, intelligent auto-sizing based on content type, and a Tetris-like auto-fitting layout system to prevent overlaps and optimize space utilization.
- **Responsive Design**: Mobile-first approach with adaptive layouts.
- **Error Handling**: Comprehensive error handling with user-friendly toast notifications for ChatGPT API issues.
- **Modern UI/UX**: Professional resize system with smooth transitions, grid snapping, and debounced auto-save.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm**: Type-safe database operations
- **openai**: Official OpenAI API client
- **wouter**: Lightweight React router

### UI & Styling
- **@radix-ui/***: Headless UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library
- **KaTeX**: For LaTeX rendering

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for development
- **esbuild**: Production bundling for server code