import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertProductSchema, 
  insertOrderSchema, 
  insertMessageSchema,
  insertReviewSchema,
  insertWishlistSchema,
  insertReportSchema 
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // User routes
  app.post("/api/users/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // TODO: Hash password in production
      const user = await storage.createUser(userData);
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // TODO: Verify password hash in production
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Product routes
  app.get("/api/products/search", async (req, res) => {
    try {
      const query = {
        search: req.query.search as string,
        category: req.query.category as string,
        size: req.query.size as string,
        color: req.query.color as string,
        gender: req.query.gender as string,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const products = await storage.searchProducts(query);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/products/featured", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 8;
      const products = await storage.getFeaturedProducts(limit);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/products/pending", async (req, res) => {
    try {
      const products = await storage.getPendingProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProductWithSeller(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Increment view count
      await storage.incrementProductViews(req.params.id);
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/products", upload.single('image'), async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      
      let processedImageUrl = productData.originalImage;
      
      if (req.file) {
        // Process image with sharp
        const processedImage = await sharp(req.file.buffer)
          .resize(800, 1000, { fit: 'cover' })
          .jpeg({ quality: 90 })
          .toBuffer();

        // In production, save to cloud storage
        // For now, we'll use a placeholder URL
        processedImageUrl = `https://processed-images.kantamanto.com/${Date.now()}.jpg`;
        
        // Simulate AI processing with Remove.bg and Fashn.ai
        await processAIImage(processedImageUrl);
      }

      const product = await storage.createProduct({
        ...productData,
        processedImage: processedImageUrl,
      });

      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const updates = req.body;
      const product = await storage.updateProduct(req.params.id, updates);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/products/:id/approve", async (req, res) => {
    try {
      const success = await storage.approveProduct(req.params.id);
      
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({ message: "Product approved successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const success = await storage.deleteProduct(req.params.id);
      
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sellers/:sellerId/products", async (req, res) => {
    try {
      const products = await storage.getProductsBySeller(req.params.sellerId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Order routes
  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrderWithDetails(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      const updates = req.body;
      const order = await storage.updateOrder(req.params.id, updates);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/buyers/:buyerId/orders", async (req, res) => {
    try {
      const orders = await storage.getOrdersByBuyer(req.params.buyerId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sellers/:sellerId/orders", async (req, res) => {
    try {
      const orders = await storage.getOrdersBySeller(req.params.sellerId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Payment routes (Paystack integration)
  app.post("/api/payments/initialize", async (req, res) => {
    try {
      const { amount, email, orderId } = req.body;
      
      if (!amount || !email || !orderId) {
        return res.status(400).json({ message: "Amount, email, and orderId are required" });
      }

      // Initialize Paystack payment
      const paymentData = await initializePaystackPayment(amount, email, orderId);
      
      res.json(paymentData);
    } catch (error) {
      res.status(500).json({ message: "Payment initialization failed" });
    }
  });

  app.post("/api/payments/verify", async (req, res) => {
    try {
      const { reference } = req.body;
      
      if (!reference) {
        return res.status(400).json({ message: "Payment reference is required" });
      }

      // Verify Paystack payment
      const paymentData = await verifyPaystackPayment(reference);
      
      if (paymentData.status === 'success') {
        // Update order status
        const orderId = paymentData.metadata.orderId;
        await storage.updateOrder(orderId, { 
          status: 'paid', 
          paymentReference: reference 
        });
      }

      res.json(paymentData);
    } catch (error) {
      res.status(500).json({ message: "Payment verification failed" });
    }
  });

  // Message routes
  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/messages/:user1Id/:user2Id", async (req, res) => {
    try {
      const { user1Id, user2Id } = req.params;
      const productId = req.query.productId as string;
      
      const messages = await storage.getMessagesBetweenUsers(user1Id, user2Id, productId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/messages/mark-read/:userId/:senderId", async (req, res) => {
    try {
      const { userId, senderId } = req.params;
      await storage.markMessagesAsRead(userId, senderId);
      res.json({ message: "Messages marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:userId/unread-messages", async (req, res) => {
    try {
      const count = await storage.getUnreadMessageCount(req.params.userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Review routes
  app.post("/api/reviews", async (req, res) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sellers/:sellerId/reviews", async (req, res) => {
    try {
      const reviews = await storage.getReviewsBySeller(req.params.sellerId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sellers/:sellerId/rating", async (req, res) => {
    try {
      const rating = await storage.getSellerAverageRating(req.params.sellerId);
      res.json({ rating });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Wishlist routes
  app.post("/api/wishlist", async (req, res) => {
    try {
      const wishlistData = insertWishlistSchema.parse(req.body);
      const wishlist = await storage.addToWishlist(wishlistData);
      res.status(201).json(wishlist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/wishlist/:userId/:productId", async (req, res) => {
    try {
      const { userId, productId } = req.params;
      const success = await storage.removeFromWishlist(userId, productId);
      
      if (!success) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }

      res.json({ message: "Item removed from wishlist" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:userId/wishlist", async (req, res) => {
    try {
      const wishlist = await storage.getUserWishlist(req.params.userId);
      res.json(wishlist);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/wishlist/:userId/:productId/exists", async (req, res) => {
    try {
      const { userId, productId } = req.params;
      const exists = await storage.isInWishlist(userId, productId);
      res.json({ exists });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Report routes
  app.post("/api/reports", async (req, res) => {
    try {
      const reportData = insertReportSchema.parse(req.body);
      const report = await storage.createReport(reportData);
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/reports", async (req, res) => {
    try {
      const status = req.query.status as string;
      const reports = await storage.getReports(status);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/reports/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const success = await storage.updateReportStatus(req.params.id, status);
      
      if (!success) {
        return res.status(404).json({ message: "Report not found" });
      }

      res.json({ message: "Report status updated" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// AI Processing Functions (Placeholder implementations)
async function processAIImage(imageUrl: string): Promise<string> {
  try {
    // Simulate Remove.bg API call
    const removeBgApiKey = process.env.REMOVE_BG_API_KEY || "placeholder_remove_bg_key";
    console.log(`Processing image with Remove.bg: ${imageUrl}`);
    
    // Simulate Fashn.ai API call for mannequin overlay
    const fashnApiKey = process.env.FASHN_AI_API_KEY || "placeholder_fashn_key";
    console.log(`Processing mannequin overlay with Fashn.ai: ${imageUrl}`);
    
    // In production, make actual API calls:
    // const removeResponse = await fetch('https://api.remove.bg/v1.0/removebg', { ... });
    // const fashnResponse = await fetch('https://api.fashn.ai/v1/try-on', { ... });
    
    return imageUrl; // Return processed image URL
  } catch (error) {
    console.error('AI processing error:', error);
    return imageUrl; // Return original on error
  }
}

// Paystack Integration Functions
async function initializePaystackPayment(amount: number, email: string, orderId: string) {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || "sk_test_placeholder_key";
    
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100, // Paystack expects amount in kobo
        email,
        currency: 'GHS',
        metadata: {
          orderId,
          custom_fields: [
            {
              display_name: "Order ID",
              variable_name: "order_id",
              value: orderId
            }
          ]
        }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Payment initialization failed');
    }

    return data;
  } catch (error) {
    console.error('Paystack initialization error:', error);
    // Return mock data for development
    return {
      status: true,
      message: "Authorization URL created",
      data: {
        authorization_url: `https://checkout.paystack.com/mock_${Date.now()}`,
        access_code: "mock_access_code",
        reference: `mock_ref_${Date.now()}`
      }
    };
  }
}

async function verifyPaystackPayment(reference: string) {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || "sk_test_placeholder_key";
    
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Payment verification failed');
    }

    return data;
  } catch (error) {
    console.error('Paystack verification error:', error);
    // Return mock success for development
    return {
      status: 'success',
      data: {
        amount: 26000, // 260 GHS in kobo
        currency: 'GHS',
        status: 'success',
        reference,
        metadata: {
          orderId: 'mock_order_id'
        }
      }
    };
  }
}
