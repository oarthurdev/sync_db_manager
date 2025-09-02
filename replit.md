# PostgreSchema Manager

## Overview

PostgreSchema Manager is a web application designed to manage PostgreSQL database schemas through a visual interface. The application allows users to create, edit, and synchronize database schema definitions using Prisma ORM with real-time validation and automatic database synchronization. It provides a productivity-focused interface with schema navigation, a code editor for Prisma schema files, database visualization, and operation history tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built using React with TypeScript and follows a modern component-based architecture:
- **React Router**: Uses Wouter for lightweight client-side routing with protected routes for authenticated users
- **State Management**: Leverages TanStack Query (React Query) for server state management and caching, eliminating the need for additional state management libraries
- **UI Framework**: Implements Radix UI components with shadcn/ui design system for consistent, accessible interface components
- **Styling**: Uses Tailwind CSS with custom CSS variables for theming, supporting both light and dark modes
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

### Backend Architecture
The backend follows a RESTful Express.js architecture with TypeScript:
- **Framework**: Express.js server with custom middleware for request logging and error handling
- **Database Layer**: Drizzle ORM for type-safe database operations with PostgreSQL
- **Authentication**: Replit OpenID Connect integration with session-based authentication using PostgreSQL session storage
- **File System**: Direct file system operations for managing individual Prisma schema files per database schema
- **Service Layer**: Separated business logic into dedicated services (SchemaService, PrismaService) for modularity

### Database Design
The application uses PostgreSQL as the primary database with the following key tables:
- **users**: Stores user authentication data from Replit OIDC
- **sessions**: Manages user sessions for authentication persistence  
- **schemas**: Stores metadata about database schemas including names, descriptions, and Prisma content
- **sync_logs**: Tracks synchronization operations and their outcomes for audit purposes

### Authentication and Authorization
- **Strategy**: Session-based authentication using Replit's OpenID Connect provider
- **Session Storage**: PostgreSQL-backed session storage with configurable TTL
- **Route Protection**: Middleware-based route protection ensuring all API endpoints require authentication
- **Error Handling**: Graceful handling of authentication failures with automatic redirect to login

### Code Editor Integration
- **Validation**: Real-time Prisma schema validation using the Prisma CLI
- **Formatting**: Automatic code formatting through Prisma's built-in formatter
- **Syntax Highlighting**: Enhanced textarea with line numbers and monospace font for better code readability
- **Auto-save**: Change tracking with visual indicators for unsaved modifications

## External Dependencies

### Database Services
- **Neon Database**: Primary PostgreSQL hosting service used as the production database
- **@neondatabase/serverless**: Specialized driver for serverless PostgreSQL connections with WebSocket support

### Authentication Services  
- **Replit Authentication**: OpenID Connect integration for user authentication and profile management
- **connect-pg-simple**: PostgreSQL session store adapter for maintaining user sessions

### Development Tools
- **Prisma**: Database toolkit for schema management, validation, formatting, and migrations
- **Drizzle**: Type-safe ORM for database operations with automatic TypeScript generation
- **Vite**: Build tool and development server with hot module replacement and plugin ecosystem

### UI and Styling Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives for building the interface
- **Tailwind CSS**: Utility-first CSS framework for responsive design and consistent styling
- **shadcn/ui**: Pre-built component library built on top of Radix UI with consistent design patterns

### Utility Libraries
- **TanStack Query**: Data fetching and caching library for efficient server state management
- **React Hook Form**: Performant form library with minimal re-renders and built-in validation
- **Zod**: TypeScript-first schema validation library for runtime type checking
- **date-fns**: Date manipulation and formatting utilities for timestamp handling