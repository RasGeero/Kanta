# Overview

Kantamanto Thrift Marketplace is a modern, AI-powered thrift marketplace connecting buyers and sellers of second-hand clothing in Ghana. The platform features AI-powered virtual try-on with mannequin overlay, secure payments via Paystack and Mobile Money, real-time chat functionality, and comprehensive admin controls. Built as a full-stack web application with React frontend and Express.js backend.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 18 with TypeScript** for type safety and modern component patterns
- **Tailwind CSS with shadcn/ui components** for consistent, modern styling with customizable design system
- **Wouter** for lightweight client-side routing instead of React Router
- **TanStack Query** for efficient data fetching, caching, and server state management
- **React Hook Form with Zod validation** for form handling and schema validation
- **Framer Motion** for smooth animations and transitions

## Backend Architecture
- **Express.js with TypeScript** providing RESTful API endpoints
- **Drizzle ORM with PostgreSQL** for type-safe database operations and schema management
- **Session-based authentication** using Express Session and Passport.js
- **Multer and Sharp** for file upload handling and image processing
- **Modular storage interface** abstracting database operations for testability

## Database Design
- **PostgreSQL** as primary database with Drizzle ORM for type-safe queries
- **Schema-first approach** with shared TypeScript types between frontend and backend
- **User roles system** supporting buyers, sellers, and admins with role-based permissions
- **Product approval workflow** with admin moderation capabilities
- **Order management** with status tracking and payment integration
- **Messaging system** for buyer-seller communication

## AI Integration Strategy
- **Placeholder API structure** for Remove.bg background removal integration
- **AI processing service layer** with error handling and fallback mechanisms
- **Image pipeline** supporting original uploads and AI-processed outputs
- **Extensible design** for future Fashn.ai virtual try-on integration

## Authentication & Authorization
- **Session-based authentication** with Express Session
- **Role-based access control** (buyer, seller, admin)
- **Protected routes** on both frontend and backend
- **User context management** for maintaining authentication state

## Payment Integration
- **Paystack integration** for card payments and bank transfers
- **Mobile Money support** for MTN, Vodafone, and AirtelTigo
- **Payment verification workflow** with webhook handling
- **Order status management** tied to payment confirmation

## State Management
- **TanStack Query** for server state and caching
- **React Context** for authentication state
- **Local storage** for cart persistence
- **Form state** managed by React Hook Form

# External Dependencies

## Payment Services
- **Paystack** for secure payment processing, card payments, and bank transfers
- **Mobile Money APIs** for Ghana-specific payment methods (MTN, Vodafone, AirtelTigo)

## AI Services
- **Remove.bg API** for automatic background removal from product images
- **Fashn.ai** (planned) for virtual try-on and mannequin overlay functionality

## Database
- **PostgreSQL** via environment variable configuration
- **Neon Database** (based on @neondatabase/serverless dependency)

## External Libraries
- **Radix UI** for accessible, unstyled component primitives
- **Tailwind CSS** for utility-first styling
- **Sharp** for server-side image processing and optimization
- **Zod** for schema validation across frontend and backend

## Development Tools
- **Vite** for fast development and building
- **TypeScript** for type safety across the entire stack
- **ESBuild** for production bundling
- **Drizzle Kit** for database migrations and schema management