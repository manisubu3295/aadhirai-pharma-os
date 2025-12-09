# Aadhirai Innovations - Pharmacy Management System

## Overview

This is a full-stack Pharmacy Management SaaS application built for healthcare businesses. The system provides comprehensive pharmacy operations including inventory management, point of sale (POS), customer management, billing, and reporting. The application supports two plan modes: BASIC (standard features) and PRO (premium features with advanced analytics, audit logging, Tally export, and location tracking).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **Charts**: Recharts for data visualization

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled with tsx for development and esbuild for production
- **Session Management**: express-session with MemoryStore (development) or connect-pg-simple (production)
- **Authentication**: Session-based auth with bcrypt password hashing
- **API Design**: RESTful JSON API endpoints under `/api/*`

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` - shared between client and server
- **Migrations**: Drizzle Kit for database migrations (`drizzle-kit push`)
- **Validation**: Zod schemas generated from Drizzle schemas using drizzle-zod

### Key Design Patterns
- **Monorepo Structure**: Client (`client/`), server (`server/`), and shared code (`shared/`)
- **Plan-Based Feature Gating**: PRO features controlled via React context (`PlanProvider`) with localStorage persistence
- **Role-Based Access Control**: Owner, Pharmacist, and Cashier roles with middleware-enforced permissions
- **Type Sharing**: Database schemas and types shared between frontend and backend

### Database Schema (Main Tables)
- `users` - System users with roles and authentication
- `medicines` - Inventory items with batch tracking, pricing, GST, and location
- `customers` - Customer records with credit limits and outstanding balances
- `doctors` - Doctor references for prescriptions
- `sales` / `saleItems` - Transaction records
- `locations` - Rack/Row/Bin storage locations (PRO feature)
- `auditLogs` - System audit trail (PRO feature)
- `creditPayments` - Credit payment tracking

## External Dependencies

### Database
- PostgreSQL database (connection via `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe database operations

### Authentication & Security
- bcrypt for password hashing
- express-session for session management
- Session secret via `SESSION_SECRET` environment variable

### UI Framework
- Radix UI primitives for accessible components
- Tailwind CSS v4 with @tailwindcss/vite plugin
- Lucide React for icons

### Development Tools
- Vite with React plugin for frontend development
- Custom Replit plugins for development banners and error overlays
- tsx for TypeScript execution in development