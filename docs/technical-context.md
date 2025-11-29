# Kantamanto Thrift Marketplace - Technical Context Document

**Last Updated:** November 29, 2025  
**Document Version:** 1.0  
**Purpose:** Authoritative technical reference for AI agents, developers, and autonomous workflows

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [Core Features](#2-core-features)
3. [Planned Features & Roadmap](#3-planned-features--roadmap)
4. [Tech Stack](#4-tech-stack)
5. [Architecture](#5-architecture)
6. [AI Integrations](#6-ai-integrations)
7. [Environment Variables](#7-environment-variables)
8. [Setup Instructions](#8-setup-instructions)
9. [Code Quality Notes](#9-code-quality-notes)
10. [Current State Summary](#10-current-state-summary)

---

## 1. Project Summary

### Overview

The **Kantamanto Thrift Marketplace** is a full-stack web application that connects buyers with sellers of second-hand clothing from Ghana's famous Kantamanto Market. The platform differentiates itself through AI-powered virtual try-on technology, allowing buyers to visualize how garments would look on fashion models before purchasing.

### Key Value Propositions

- **Virtual Try-On Technology:** AI-powered feature using Fashn.ai to superimpose garments onto fashion model images
- **Background Removal:** Automatic product image enhancement using Remove.bg API
- **Ghana-Focused Payments:** Paystack integration with Mobile Money (MTN, Vodafone, AirtelTigo) support
- **Seller Empowerment:** Comprehensive dashboard with AI Studio for product enhancement
- **Multi-Role System:** Distinct experiences for buyers, sellers, and administrators

### Target Market

- **Primary:** Ghanaian fashion enthusiasts seeking affordable, unique second-hand clothing
- **Secondary:** International diaspora interested in authentic Ghanaian thrift fashion
- **Sellers:** Kantamanto market traders expanding their digital presence

### Business Model

- Marketplace commission on sales
- Free listing for sellers
- AI-enhanced product presentation as a competitive advantage

---

## 2. Core Features

### 2.1 Authentication & User Management

**Location:** `server/routes.ts`, `client/src/contexts/auth-context.tsx`

- Session-based authentication using `express-session` with PostgreSQL store
- Password hashing with `bcryptjs`
- Role-based access control (buyer, seller, admin)
- Profile management with email, phone, and account settings
- Account deletion with GDPR-compliant data export

**User Roles:**

| Role | Capabilities |
|------|-------------|
| Buyer | Browse products, wishlist, cart, orders, messaging |
| Seller | All buyer features + product listing, AI Studio, order management |
| Admin | All features + user management, product approval, reports |

### 2.2 Product Management

**Location:** `client/src/pages/seller-dashboard.tsx`, `server/routes.ts`

- Multi-image upload with Cloudinary storage
- Automatic background removal via Remove.bg
- AI virtual try-on preview generation
- Product categories: Dresses, Shirts, Pants, Shoes, Accessories, Vintage
- Size options: XS, S, M, L, XL, XXL
- Color and gender filters
- Condition tracking (new, like_new, good, fair)
- Admin approval workflow for quality control

**Product States:**
- `pending` - Awaiting admin approval
- `approved` - Active and visible to buyers
- `rejected` - Failed quality review
- `sold` - Purchased by buyer

### 2.3 AI Studio

**Location:** `client/src/pages/ai-studio.tsx`, `client/src/services/ai-processing.ts`

The AI Studio is the flagship feature enabling sellers to enhance product photos:

**Workflow:**
1. Seller uploads garment image
2. System removes background using Remove.bg
3. Seller selects or auto-assigns fashion model
4. Fashn.ai generates virtual try-on image
5. Processed image stored in Cloudinary

**Components:**
- `FashionModelSelector.tsx` - Model selection UI
- `FashionModelGallery.tsx` - Model browsing grid
- `ImageUploader.tsx` - Multi-image upload handling
- `TryOnPreview.tsx` - Real-time preview display

### 2.4 Fashion Model System

**Location:** `shared/schema.ts` (fashionModels table), `server/routes.ts`

Fashion models are virtual mannequins used for AI try-on:

**Model Attributes:**
- Name, gender (men/women/unisex)
- Body type (slim, athletic, average, plus)
- Ethnicity classification
- Category (formal, casual, evening, athletic, general)
- Usage analytics (totalInteractions, successRate, recentUsage)
- Sort order for display priority
- Featured flag for prominence

**Smart Selection Algorithm:**
```typescript
// Scoring factors (from routes.ts):
- Gender match: 100 points
- Category match: 60 points
- Success rate: up to 30 points
- Recent usage: up to 25 points
- Featured status: 20 points
- Total interactions: up to 15 points
```

### 2.5 Shopping Cart & Checkout

**Location:** `client/src/services/api.ts` (cartApi), `server/routes.ts`

- Persistent server-side cart storage
- Size selection per item
- Quantity management
- Real-time total calculation in GHS (Ghanaian Cedis)

### 2.6 Order Management

**Location:** `shared/schema.ts` (orders table), `server/routes.ts`

**Order Statuses:**
- `pending` - Order placed, awaiting payment
- `paid` - Payment confirmed
- `processing` - Seller preparing shipment
- `shipped` - In transit
- `delivered` - Completed
- `cancelled` - Order cancelled

**Order Details:**
- Buyer and seller references
- Product with quantity and size
- Total amount in GHS
- Shipping address (JSON)
- Payment reference

### 2.7 Payment Integration

**Location:** `client/src/services/paystack.ts`, `server/routes.ts`

**Paystack Integration:**
- GHS currency support
- Card payments
- Mobile Money (MTN, Vodafone, AirtelTigo)
- Webhook verification
- Payment status tracking

**Payment Flow:**
1. User initiates checkout
2. Backend creates Paystack transaction
3. User completes payment on Paystack
4. Webhook or callback verifies payment
5. Order status updated to `paid`

### 2.8 Messaging System

**Location:** `shared/schema.ts` (messages table), `server/routes.ts`

- Direct messaging between buyers and sellers
- Product-specific conversations
- Read/unread status tracking
- Unread message count in header

### 2.9 Wishlist

**Location:** `client/src/services/api.ts` (wishlistApi)

- Save products for later
- One-click add to cart from wishlist
- Wishlist count in navigation

### 2.10 Reviews & Ratings

**Location:** `shared/schema.ts` (reviews table)

- Star rating (1-5)
- Text review
- Order-linked reviews
- Seller average rating calculation

### 2.11 Reporting System

**Location:** `shared/schema.ts` (reports table)

- Report products or users
- Reason categories: inappropriate, counterfeit, spam, harassment
- Admin review workflow
- Status tracking (pending, reviewed, resolved, dismissed)

---

## 3. Planned Features & Roadmap

### Short-Term (Next Release)

1. **Real-time Notifications**
   - WebSocket implementation for instant updates
   - Order status push notifications
   - New message alerts

2. **Enhanced Search**
   - Full-text search with PostgreSQL
   - Filter persistence in URL
   - Saved searches

3. **Seller Analytics Dashboard**
   - Revenue charts with Recharts
   - Top-selling products
   - Customer demographics

### Medium-Term

1. **Mobile App**
   - React Native version
   - Push notifications
   - Camera-first product upload

2. **Inventory Management**
   - Stock tracking
   - Low stock alerts
   - Batch upload via CSV

3. **Shipping Integration**
   - Ghana Post API
   - Delivery tracking
   - Shipping cost calculator

### Long-Term

1. **Multi-Vendor Marketplace**
   - Verified seller badges
   - Seller subscription tiers
   - Featured placement options

2. **AI Enhancements**
   - Size recommendation from measurements
   - Style matching suggestions
   - Outfit bundling

3. **Internationalization**
   - Multi-currency support
   - Language localization
   - International shipping

---

## 4. Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool & dev server |
| TanStack Query | 5.x | Server state management |
| Wouter | 3.x | Client-side routing |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui | - | Component library |
| Framer Motion | - | Animations |
| Recharts | - | Data visualization |
| React Hook Form | - | Form handling |
| Zod | - | Schema validation |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime environment |
| Express | 4.x | HTTP framework |
| TypeScript | 5.x | Type safety |
| Drizzle ORM | - | Database ORM |
| PostgreSQL | 15.x | Primary database |
| express-session | - | Session management |
| connect-pg-simple | - | PostgreSQL session store |
| bcryptjs | - | Password hashing |
| multer | - | File upload handling |

### External Services

| Service | Purpose |
|---------|---------|
| Cloudinary | Image storage & transformation |
| Remove.bg | Background removal API |
| Fashn.ai | Virtual try-on AI |
| Paystack | Payment processing |
| Neon PostgreSQL | Managed database |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| tsx | TypeScript execution |
| drizzle-kit | Database migrations |

---

## 5. Architecture

### 5.1 Project Structure

```
kantamanto-marketplace/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ai-studio/     # AI try-on components
│   │   │   ├── auth/          # Authentication modals
│   │   │   ├── cart/          # Shopping cart components
│   │   │   ├── layout/        # Header, Footer, Navigation
│   │   │   ├── product/       # Product cards, modals
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── contexts/          # React contexts (Auth)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities (queryClient)
│   │   ├── pages/             # Route components
│   │   ├── services/          # API service layers
│   │   ├── types/             # TypeScript type definitions
│   │   ├── App.tsx            # Root component with routing
│   │   ├── index.css          # Global styles & theme
│   │   └── main.tsx           # Entry point
│   └── index.html             # HTML template
├── server/                    # Backend Express application
│   ├── routes.ts              # API endpoints (2300+ lines)
│   ├── storage.ts             # Database access layer
│   ├── db.ts                  # Database connection
│   ├── vite.ts                # Vite middleware integration
│   └── index.ts               # Server entry point
├── shared/                    # Shared code
│   └── schema.ts              # Drizzle schema & Zod types
├── docs/                      # Documentation
│   └── technical-context.md   # This document
├── drizzle.config.ts          # Drizzle ORM configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies & scripts
```

### 5.2 Database Schema

**Core Tables:**

```typescript
// Users
users {
  id: uuid (primary key)
  username: varchar(50) unique
  email: varchar(255) unique
  password: text (hashed)
  firstName: varchar(100)
  lastName: varchar(100)
  phone: varchar(20)
  role: enum('buyer', 'seller', 'admin')
  createdAt: timestamp
  updatedAt: timestamp
}

// Products
products {
  id: uuid (primary key)
  sellerId: uuid (foreign key → users)
  title: varchar(255)
  description: text
  price: decimal(10, 2)
  category: varchar(50)
  size: varchar(20)
  color: varchar(50)
  condition: enum('new', 'like_new', 'good', 'fair')
  gender: varchar(20)
  originalImage: text
  processedImage: text
  aiPreviewUrl: text
  assignedModelId: uuid
  status: enum('pending', 'approved', 'rejected', 'sold')
  views: integer
  createdAt: timestamp
}

// Fashion Models (for AI try-on)
fashionModels {
  id: uuid (primary key)
  name: varchar(100)
  gender: varchar(20)
  bodyType: varchar(50)
  ethnicity: varchar(50)
  category: varchar(50)
  imageUrl: text
  thumbnailUrl: text
  tags: text[]
  isActive: boolean
  isFeatured: boolean
  usage: integer
  totalInteractions: integer
  successRate: decimal
  recentUsage: integer
  sortOrder: integer
}

// Orders
orders {
  id: uuid (primary key)
  buyerId: uuid (foreign key → users)
  sellerId: uuid (foreign key → users)
  productId: uuid (foreign key → products)
  quantity: integer
  size: varchar(20)
  totalAmount: decimal(10, 2)
  status: enum('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')
  shippingAddress: jsonb
  paymentReference: varchar(255)
  createdAt: timestamp
  updatedAt: timestamp
}

// Additional Tables
- cartItems: Shopping cart persistence
- wishlist: User wishlisted products
- messages: Buyer-seller communication
- reviews: Product/seller reviews
- reports: Content moderation
- session: Express session storage
```

### 5.3 API Structure

**Authentication Endpoints:**
```
POST   /api/auth/register      # Create new account
POST   /api/auth/login         # Login with credentials
POST   /api/auth/logout        # End session
GET    /api/auth/me            # Get current user
```

**Product Endpoints:**
```
GET    /api/products/search    # Search with filters
GET    /api/products/featured  # Featured products
GET    /api/products/pending   # Admin: pending approval
GET    /api/products/:id       # Single product
POST   /api/products           # Create product (multipart)
PUT    /api/products/:id       # Update product
PATCH  /api/products/:id/model # Assign fashion model
DELETE /api/products/:id       # Delete product
POST   /api/products/:id/approve # Admin: approve product
```

**Fashion Model Endpoints:**
```
GET    /api/fashion-models     # List all models
GET    /api/fashion-models/recommended # AI-recommended models
GET    /api/fashion-models/:id # Single model
POST   /api/fashion-models     # Create model (admin)
PUT    /api/fashion-models/:id # Update model
PATCH  /api/fashion-models/:id/toggle # Toggle active status
DELETE /api/fashion-models/:id # Delete model
```

**Commerce Endpoints:**
```
GET    /api/cart               # Get user's cart
POST   /api/cart               # Add to cart
PUT    /api/cart/:productId    # Update quantity
DELETE /api/cart/:productId    # Remove from cart
DELETE /api/cart               # Clear cart

GET    /api/wishlist           # Get wishlist
POST   /api/wishlist           # Add to wishlist
DELETE /api/wishlist/:productId # Remove from wishlist

GET    /api/orders             # User's orders
POST   /api/orders             # Create order
PUT    /api/orders/:id         # Update order status
```

**Payment Endpoints:**
```
POST   /api/payments/initialize # Start Paystack transaction
POST   /api/payments/verify     # Verify payment
GET    /api/payments/callback   # Paystack callback handler
```

**AI Processing Endpoints:**
```
POST   /api/ai/remove-background # Remove.bg processing
POST   /api/ai/virtual-tryon     # Fashn.ai try-on
```

### 5.4 Client-Side Routing

```typescript
// client/src/App.tsx routes
/                    → Home (featured products, hero section)
/search              → Product search with filters
/product/:id         → Product detail page
/cart                → Shopping cart
/checkout            → Checkout flow
/orders              → Order history
/wishlist            → Saved products
/messages            → Messaging center
/settings            → Account settings
/seller-dashboard    → Seller management panel
/ai-studio           → AI try-on studio
/admin               → Admin dashboard (role-gated)
```

### 5.5 State Management

**Server State (TanStack Query):**
- Products, orders, cart, wishlist
- User profile and authentication
- Fashion models

**Client State:**
- Form inputs (react-hook-form)
- UI state (modals, filters)
- Theme preference (localStorage)

**Session State:**
- Authentication (express-session)
- Cart (server-side persistence)

---

## 6. AI Integrations

### 6.1 Remove.bg - Background Removal

**Purpose:** Clean product images by removing backgrounds

**Integration Flow:**
1. User uploads product image
2. Image sent to `/api/ai/remove-background`
3. Server calls Remove.bg API
4. Transparent background image returned
5. Result uploaded to Cloudinary
6. URL stored in product record

**API Details:**
```javascript
// server/routes.ts
const response = await fetch('https://api.remove.bg/v1.0/removebg', {
  method: 'POST',
  headers: {
    'X-Api-Key': process.env.REMOVE_BG_API_KEY,
  },
  body: formData // image file
});
```

**Rate Limits:** Depends on plan (free tier: 50 images/month)

### 6.2 Fashn.ai - Virtual Try-On

**Purpose:** Generate images of garments on fashion models

**Integration Flow:**
1. Background-removed garment image ready
2. Fashion model selected (auto or manual)
3. Server submits job to Fashn.ai
4. Polling for completion (up to 60 seconds)
5. Result image URL returned
6. Stored as `aiPreviewUrl` on product

**API Implementation:**
```javascript
// server/routes.ts - processVirtualTryOn function
const requestBody = {
  model_name: "tryon-v1.6",
  inputs: {
    model_image: modelImageUrl,      // Fashion model
    garment_image: garmentImageUrl,   // Product with transparent bg
    category: "upper_body" | "lower_body" | "full_body"
  }
};

// Submit job
const runResponse = await fetch('https://api.fashn.ai/v1/run', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.FASHN_AI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestBody)
});

// Poll status
const statusResponse = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
  headers: { 'Authorization': `Bearer ${process.env.FASHN_AI_API_KEY}` }
});
```

**Garment Category Mapping:**
```javascript
function mapGarmentTypeToFashnCategory(garmentType: string) {
  const type = garmentType.toLowerCase();
  if (['dress', 'top', 'shirt', 'blouse', 'jacket'].includes(type)) 
    return 'upper_body';
  if (['pants', 'trousers', 'skirt', 'shorts'].includes(type)) 
    return 'lower_body';
  return 'full_body';
}
```

### 6.3 Cloudinary - Image Storage

**Purpose:** Cloud-based image storage and transformation

**Usage:**
- Product images (original and processed)
- Fashion model images
- User profile photos (future)

**URL Format:**
```
https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{format}
```

**Configuration:** Via `CLOUDINARY_URL` environment variable

---

## 7. Environment Variables

### Required Secrets

| Variable | Description | Required |
|----------|-------------|----------|
| `SESSION_SECRET` | Express session encryption key | Yes |
| `DATABASE_URL` | PostgreSQL connection string (auto-set by Replit) | Yes |
| `CLOUDINARY_URL` | Cloudinary credentials URL | Yes |
| `REMOVE_BG_API_KEY` | Remove.bg API key | Yes |
| `FASHN_AI_API_KEY` | Fashn.ai API key | Yes |
| `PAYSTACK_SECRET_API_KEY` | Paystack server-side key | Yes |
| `PAYSTACK_PUBLIC_API_KEY` | Paystack client-side key | Yes |

### System Variables (Auto-configured)

| Variable | Description |
|----------|-------------|
| `REPLIT_DOMAINS` | Replit deployment domains |
| `REPLIT_DEV_DOMAIN` | Development preview URL |
| `REPL_ID` | Unique Replit project identifier |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | PostgreSQL connection (Neon) |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Application base URL | `http://localhost:5000` |
| `NODE_ENV` | Environment mode | `development` |

---

## 8. Setup Instructions

### 8.1 Prerequisites

- Node.js 20.x or later
- PostgreSQL 15.x (provided by Replit Neon)
- Cloudinary account
- Remove.bg API key
- Fashn.ai API key
- Paystack account

### 8.2 Local Development

```bash
# 1. Clone repository (if applicable)
git clone <repository-url>
cd kantamanto-marketplace

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Add all required secrets via Replit Secrets tab or .env file

# 4. Initialize database
npm run db:push

# 5. Start development server
npm run dev
```

### 8.3 Database Migrations

```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations to database
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### 8.4 Deployment

The application is configured for Replit deployment:

1. Ensure all secrets are configured in Replit Secrets
2. The `Start application` workflow runs `npm run dev`
3. For production, configure proper deployment settings

---

## 9. Code Quality Notes

### 9.1 Conventions

**File Naming:**
- React components: PascalCase (`ProductCard.tsx`)
- Utilities/services: camelCase (`queryClient.ts`)
- Pages: kebab-case (`seller-dashboard.tsx`)

**Import Paths:**
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

**Component Structure:**
```typescript
// Standard component pattern
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { Product } from "@shared/schema";

interface Props {
  product: Product;
  onAction: (id: string) => void;
}

export default function ComponentName({ product, onAction }: Props) {
  // Hooks first
  const [state, setState] = useState();
  const { data } = useQuery({ queryKey: ['key'] });
  
  // Event handlers
  const handleClick = () => {};
  
  // Render
  return <div data-testid="component-name">...</div>;
}
```

### 9.2 Data Fetching Patterns

**Queries:**
```typescript
// Always use object form (TanStack Query v5)
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/products', productId],
  queryFn: () => productApi.getProduct(productId),
  enabled: !!productId
});
```

**Mutations:**
```typescript
const mutation = useMutation({
  mutationFn: (data) => productApi.createProduct(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    toast({ title: "Success!" });
  }
});
```

### 9.3 Form Handling

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";

const form = useForm({
  resolver: zodResolver(insertProductSchema),
  defaultValues: {
    title: "",
    price: 0,
    // ...
  }
});
```

### 9.4 Error Handling

```typescript
// API errors wrapped in try-catch
try {
  const result = await apiRequest('POST', '/api/endpoint', data);
  return result.json();
} catch (error) {
  console.error('Operation failed:', error);
  toast({ 
    title: "Error", 
    description: "Something went wrong",
    variant: "destructive" 
  });
}
```

### 9.5 Known Technical Debt

1. **Large Routes File:** `server/routes.ts` exceeds 2300 lines - consider splitting by domain (products, orders, auth, ai)
2. **Mobile Money Simulation:** `paystack.ts` mobile money is simulated - needs real integration
3. **Session Storage:** Uses `MemoryStore` in development - PostgreSQL session store for production
4. **Image Optimization:** Large images not resized before upload
5. **Search Performance:** Basic ILIKE queries - consider full-text search indices

### 9.6 Testing Considerations

- All interactive elements have `data-testid` attributes
- Pattern: `button-{action}`, `input-{field}`, `card-{type}-{id}`
- API endpoints return consistent error formats

---

## 10. Current State Summary

### 10.1 Completion Status

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | Complete | Session-based with roles |
| Product CRUD | Complete | With approval workflow |
| AI Background Removal | Complete | Remove.bg integrated |
| AI Virtual Try-On | Complete | Fashn.ai integrated |
| Fashion Model System | Complete | With smart selection |
| Shopping Cart | Complete | Server-side persistence |
| Checkout Flow | Complete | UI implemented |
| Paystack Payments | Complete | Card + MoMo (simulated) |
| Order Management | Complete | Full lifecycle |
| Messaging | Complete | Buyer-seller communication |
| Wishlist | Complete | Full CRUD |
| Reviews | Complete | With ratings |
| Admin Dashboard | Partial | Basic functionality |
| Dark Mode | Complete | Theme toggle |
| Responsive Design | Complete | Mobile-optimized |

### 10.2 Database Status

- **ORM:** Drizzle with PostgreSQL (Neon)
- **Migrations:** Managed via `drizzle-kit`
- **Schema:** Fully defined in `shared/schema.ts`
- **Connection:** Pooled via `@neondatabase/serverless`

### 10.3 Active Workflows

| Workflow | Command | Port |
|----------|---------|------|
| Start application | `npm run dev` | 5000 |

### 10.4 Performance Considerations

- **Image Loading:** Cloudinary transformations for optimization
- **API Caching:** TanStack Query with 10-minute stale time
- **Session Caching:** Reduced database lookups

### 10.5 Security Measures

- Password hashing with bcrypt (salt rounds: 10)
- Session cookies with secure flags
- CORS configured for Replit domains
- SQL injection prevention via Drizzle ORM
- XSS protection via React's JSX escaping
- Role-based route protection

---

## Appendix

### A. Useful Commands

```bash
# Development
npm run dev          # Start dev server (frontend + backend)
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:push      # Apply schema to database
npm run db:generate  # Generate migrations
npm run db:studio    # Open Drizzle Studio

# Type checking
npm run typecheck    # Run TypeScript compiler
```

### B. File Quick Reference

| Need to... | Look in... |
|------------|-----------|
| Add API endpoint | `server/routes.ts` |
| Add database table | `shared/schema.ts` |
| Add frontend page | `client/src/pages/` + `App.tsx` |
| Add UI component | `client/src/components/ui/` |
| Modify theme | `client/src/index.css` |
| Add environment variable | Replit Secrets + code reference |

### C. Contact & Resources

- **Replit Project:** Kantamanto Thrift Marketplace
- **External APIs:**
  - [Cloudinary Docs](https://cloudinary.com/documentation)
  - [Remove.bg API](https://www.remove.bg/api)
  - [Fashn.ai Docs](https://fashn.ai/docs)
  - [Paystack Docs](https://paystack.com/docs)

---

*This document should be updated whenever significant architectural changes are made to the project.*
