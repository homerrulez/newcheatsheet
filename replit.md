# replit.md

## Overview

StudyFlow is a full-stack web application designed as an academic productivity platform. It provides three main workspace types for students and academics: document editing with LaTeX support, interactive cheat sheets, and customizable templates. The application features AI-powered assistance through OpenAI integration and real-time collaboration capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### July 30, 2025 - LaTeX Rendering Error Root Cause Fix
- **Issue**: ALL 50 physics equation boxes contain problematic LaTeX syntax causing render failures
- **Root Cause**: ChatGPT generating LaTeX with \\text{N}, \\text{J} unit annotations that KaTeX rejects
- **Analysis**: Every box contains \\text{} unit commands and escaped backslashes causing pre-rendered LaTeX
- **Solution**: Enhanced preprocessing removes unit annotations like ", (\\text{N})" and all text commands
- **Changes**: Strengthened LaTeX cleaning to handle unit parentheses and improved ChatGPT prompts
- **Status**: ✓ Completed - Enhanced preprocessing handles all content types with universal auto-fitting

### July 30, 2025 - Tetris-Like Auto-Fitting Layout System
- **Issue**: Boxes were overlapping and creating messy layouts instead of optimal space utilization
- **Solution**: Implemented intelligent tetris-like positioning algorithm with collision detection
- **Changes**: 
  - Created sophisticated content analysis for optimal box sizing
  - Built tetris-like positioning algorithm that finds best placement without overlaps
  - Added collision detection with proper spacing margins
  - Implemented space-efficient packing that maximizes page utilization
  - Enhanced auto-arrange to only trigger for new boxes to prevent layout disruption
  - Increased maximum box dimensions to 800x600px for large content
- **Status**: 🔄 In Progress - Refining collision detection and spacing for clean layouts

### July 29, 2025 - ChatGPT Error Handling Improvements
- **Issue**: ChatGPT messages were silently failing due to API quota exceeded
- **Solution**: Added comprehensive error handling with user-friendly toast notifications
- **Changes**: Enhanced chat component with proper error states and messaging
- **Status**: ✓ Completed - ChatGPT working with new API key

### July 29, 2025 - Modern Resize System Overhaul
- **Issue**: Box resizing was unprofessional, boxes jumping between pages during resize
- **Solution**: Complete rewrite of drag/resize system with modern UX patterns
- **Changes**: 
  - Fixed positioning logic (using `position` instead of `defaultPosition`)
  - Added professional resize handles with gradient styling and smooth transitions
  - Implemented proper drag handle area with visual indicators
  - Added grid snapping (10px) for precise positioning
  - Included debounced auto-save during interactions
  - Added boundary constraints and proper state synchronization
- **Status**: ✓ Completed - Modern, professional resize experience

### July 29, 2025 - Intelligent Auto-Sizing System
- **Issue**: Boxes required manual resizing regardless of content type (math, physics, essays, chapters)
- **Solution**: Implemented intelligent auto-sizing that adapts to content type and length
- **Changes**:
  - Added content analysis for math formulas, long text, and multi-line content
  - Implemented optimal sizing calculations based on content metrics
  - Created specialized sizing for different content types (math vs text vs essays)
  - Added "Auto-fit All" button for manual triggering
  - Increased maximum box dimensions to 800x600px for larger content
  - Auto-sizing applies to new AI-generated boxes automatically
- **Status**: ✓ Completed - Boxes now auto-fit any content without manual intervention

### July 29, 2025 - Sequential Box Numbering and ChatGPT Operations
- **Issue**: Need numbered boxes for ChatGPT to reference and manipulate specific content
- **Solution**: Added sequential numbering system with full ChatGPT integration
- **Changes**:
  - Added numbered badges (1, 2, 3...) to each box title header
  - Updated ChatGPT system prompt to support numbered box operations
  - Implemented delete, edit, and replace operations via box numbers
  - Added current box context to ChatGPT conversations
  - Enhanced box operation handling with auto-resizing for edited content
- **Status**: ✓ Completed - ChatGPT can now interact with specific numbered boxes

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Radix UI components with Tailwind CSS styling
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API with conventional routes
- **Middleware**: Custom logging, JSON parsing, error handling
- **Development**: Hot module replacement via Vite integration

### Database & ORM
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with Drizzle Kit for migrations
- **Schema**: Shared schema definitions between client and server
- **Validation**: Zod schemas for runtime type validation

## Key Components

### Workspace Types
1. **Document Workspace**: Rich text editor with LaTeX rendering support
2. **Cheat Sheet Workspace**: Grid-based layout with customizable boxes
3. **Template Workspace**: Structured templates for different academic subjects

### Core Features
- **LaTeX Rendering**: Dynamic mathematical notation rendering via KaTeX
- **AI Chat Integration**: OpenAI-powered assistance contextual to each workspace
- **Real-time Collaboration**: Shared workspaces with chat history
- **Responsive Design**: Mobile-first approach with adaptive layouts

### UI Components
- **Component Library**: Comprehensive set of Radix UI primitives
- **Design System**: Consistent theming with CSS custom properties
- **Form Handling**: React Hook Form with Zod validation
- **Accessibility**: ARIA-compliant components throughout

## Data Flow

### Client-Server Communication
1. Frontend makes API requests using TanStack Query
2. Server processes requests with Express middleware chain
3. Data validation occurs at API boundary using Zod schemas
4. Database operations handled through Drizzle ORM
5. Response data cached and synchronized on client

### State Management
- Server state managed by TanStack Query with automatic caching
- Local component state handled by React hooks
- Form state managed by React Hook Form
- Global UI state (toasts, modals) via context providers

### AI Integration
- Chat messages stored per workspace with type and ID
- OpenAI API calls made from server with user context
- Responses integrated into workspace content dynamically
- Chat history maintained for conversation continuity

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

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for development
- **esbuild**: Production bundling for server code

## Deployment Strategy

### Build Process
1. Frontend built with Vite to `dist/public` directory
2. Server code bundled with esbuild to `dist` directory
3. Static assets served by Express in production
4. Environment-specific configuration via environment variables

### Environment Configuration
- Development: Vite dev server with Express API proxy
- Production: Single Express server serving both API and static files
- Database: PostgreSQL connection via DATABASE_URL environment variable
- AI: OpenAI API key via OPENAI_API_KEY environment variable

### Deployment Requirements
- Node.js runtime environment
- PostgreSQL database instance
- Environment variables for external service credentials
- Static file serving capability for frontend assets