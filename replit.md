# replit.md

## Overview

StudyFlow is a full-stack web application designed as an academic productivity platform. It provides three main workspace types for students and academics: document editing with LaTeX support, interactive cheat sheets, and customizable templates. The application features AI-powered assistance through OpenAI integration and real-time collaboration capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### August 2, 2025 - Site-wide Beautiful Gradient Background
- **Applied 1:1 Replica**: Implemented exact pastel gradient from Math Company reference image
- **Method Used**: CSS gradient with 8 precise color stops for perfect match
- **Coverage**: Site-wide background applied to body element with proper CSS properties
- **Implementation**: 
  - `background-size: cover`
  - `background-repeat: no-repeat` 
  - `background-attachment: fixed`
  - `background-position: center center`
- **Colors**: Light lavender → purple → pink → light blue → mint → cyan → bright cyan → turquoise
- **Pages Updated**: All pages (landing, document, template, cheatsheet) now inherit the global background
- **Status**: ✓ Complete - Beautiful horizontal gradient flows across entire application

### August 2, 2025 - CRITICAL FIX: ChatGPT Natural Language Intelligence 
- **Major Issue Resolved**: ChatGPT was adding command text ("FORMAT_TEXT", "CENTER") directly to document instead of executing internally
- **Enhanced System Prompt**: Completely redesigned to distinguish between content creation vs command execution
- **Smart Response Detection**: Added CENTER_TEXT command parsing and execution in frontend
- **Natural Language Understanding**: "the title should be in the middle" now centers text, doesn't add command text
- **Content vs Commands**: Clear separation - "create X" generates content, "center X" executes commands
- **Status**: ✓ Fixed - ChatGPT now intelligently understands natural language without polluting documents

### August 2, 2025 - Fixed ChatGPT Layout & Panel Separation
- **Issues Resolved**: 
  - ChatGPT interface now always visible at top of right panel - no scrolling needed
  - Removed duplicate chat history from right panel - now only appears in proper left panel location
  - Fixed three-panel layout separation - chat history belongs exclusively in left panel
- **Layout Improvements**:
  - **ChatGPT Position**: Always visible at top of right panel with compact design
  - **Panel Separation**: Clear distinction between left (chat history) and right (ChatGPT assistant) panels
  - **No Scrolling**: ChatGPT input box immediately accessible without any scrolling
  - **Proper Organization**: Chat sessions appear only in left panel where they belong

### August 2, 2025 - Natural Language ChatGPT Integration & Layout Engine
- **Issues Resolved**: 
  - Fixed ChatGPT adding command text instead of actual content when users request natural content creation
  - Enhanced natural language understanding to respond with only the obvious content, not explanations
  - Improved content detection to distinguish between conversational responses and insertable content
- **Advanced Layout Engine**: Comprehensive automatic pagination and content flow management
  - **LAYOUT_TEXT Function**: Automatically splits content into chunks and distributes across pages
  - **Content Reflow**: Dynamic reflow when font size or page size changes with smart scaling
  - **PREVIEW_LAYOUT Mode**: Shows estimated page count before actual content insertion
  - **Page Metrics**: Real-time display of characters/line, lines/page, total capacity
  - **7 Page Sizes**: All major formats (Letter, Legal, A4, A3, Tabloid, Executive, Ledger) with auto-scaling
- **Natural Language Processing**: 
  - **Conversational Understanding**: "create a title about Ali and make it adventurous" → adds "The Life and Adventures of Ali"
  - **Content vs Commands**: Distinguishes between content creation requests and document manipulation commands
  - **Smart Content Detection**: Identifies pure content vs conversational responses automatically

### August 2, 2025 - Complete Document Workspace Overhaul: Best Microsoft Word Experience
- **Issues Resolved**: 
  - Chat session creation validation errors fixed
  - Removed manual session creation requirement - now works like ChatGPT
  - Fixed pagination system for proper multi-page content distribution
- **New Architecture**: Professional three-panel Microsoft Word interface
  - **Left Panel**: Chat history with expandable sessions and management tools
  - **Center Panel**: True pagination with single continuous editor and proper page flow
  - **Right Panel**: Always-available ChatGPT with document control commands
- **ChatGPT Integration Features**:
  - **Always Available**: No need to create sessions - chat is ready instantly
  - **Auto-Session Management**: Default session created automatically
  - **Document Commands**: Execute "delete page 2", "make text bold", "add content"
  - **Real-time Updates**: Changes applied instantly to document
- **Pagination System**:
  - **True Page Boundaries**: Real Letter/A4/Legal page dimensions
  - **Continuous Editor**: Single Tiptap editor with proper content flow
  - **Dynamic Page Count**: Pages calculated based on actual content height
  - **Visual Page Indicators**: Clear page breaks and numbering
- **Professional Features**:
  - **Full Formatting Toolbar**: Font controls, alignment, text styling
  - **Zoom Controls**: 25% to 200% zoom with real-time scaling
  - **Auto-save**: Continuous document saving with debounced updates
  - **Document Properties**: Page size, font family, color controls
- **Status**: ✓ Completed - Professional Microsoft Word-level document workspace with seamless ChatGPT integration and true pagination. Users can now edit documents naturally while ChatGPT provides instant assistance and document control.

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