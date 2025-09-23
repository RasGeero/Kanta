# Kantamanto Thrift Marketplace

A modern, AI-powered thrift marketplace connecting buyers and sellers of second-hand clothing in Ghana. Built with React, TypeScript, Express.js, and integrated with Paystack for payments and AI services for virtual try-on experiences.

## Features

### For Buyers
- 🛍️ Browse and search thousands of unique thrift items
- 🤖 AI-powered virtual try-on with model overlay
- 💬 Chat directly with sellers
- 💳 Secure payments with Paystack and Mobile Money
- ❤️ Wishlist and save favorite items
- 📱 Mobile-first responsive design
- 🎯 Advanced filtering by size, color, category, price, and more

### For Sellers
- 📸 Upload product photos with automatic AI processing
- 🎨 Background removal and model overlay via Remove.bg and Fashn.ai
- 📊 Seller dashboard with analytics and performance metrics
- 📦 Order management and inventory tracking
- 💰 Direct payments to your Mobile Money or bank account
- ⭐ Build your reputation with customer reviews

### For Admins
- 🛡️ Content moderation and approval workflow
- 📈 Comprehensive analytics and reporting
- 👥 User and seller management
- 🚨 Report handling and dispute resolution
- 💼 Platform oversight and configuration

## Tech Stack

### Frontend
- **React 18** with TypeScript for type safety
- **Tailwind CSS** with shadcn/ui components for modern styling
- **Wouter** for lightweight client-side routing
- **TanStack Query** for efficient data fetching and caching
- **React Hook Form** with Zod validation for forms
- **Framer Motion** for smooth animations

### Backend
- **Express.js** with TypeScript for the REST API
- **Drizzle ORM** with PostgreSQL for database management
- **Multer** and **Sharp** for image processing
- **Passport.js** for authentication
- **Express Session** for session management

### Integrations
- **Paystack** for secure payments (cards, bank transfers)
- **Mobile Money** support (MTN, Vodafone, AirtelTigo)
- **Remove.bg** for automatic background removal
- **Fashn.ai** for AI-powered model overlay
- **Cloudinary** for image storage and optimization

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Paystack account (for payments)
- Remove.bg API key (for background removal)
- Fashn.ai API key (for model overlay)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/kantamanto-marketplace.git
   cd kantamanto-marketplace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/kantamanto
   SESSION_SECRET=your-super-secret-session-key
   PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
   VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
   REMOVE_BG_API_KEY=your_remove_bg_api_key
   FASHN_AI_API_KEY=your_fashn_ai_api_key
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

## Development

### Project Structure
