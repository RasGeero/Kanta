import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertProductSchema, 
  insertOrderSchema, 
  insertMessageSchema,
  insertReviewSchema,
  insertWishlistSchema,
  insertReportSchema,
  insertCartItemSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";

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

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.session.userRole !== role && req.session.userRole !== 'admin') {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Check if username is taken
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username is already taken" });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Create session
      req.session.userId = user.id;
      req.session.userRole = user.role;
      
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is deactivated" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session
      req.session.userId = user.id;
      req.session.userRole = user.role;

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.isActive) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      // Users can only access their own profile or admins can access any
      if (req.params.id !== req.session.userId && req.session.userRole !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

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

  app.get("/api/users", requireRole('admin'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user profile
  app.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      // Users can only update their own profile or admins can update any
      if (req.params.id !== req.session.userId && req.session.userRole !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate request body with Zod
      const updateProfileSchema = z.object({
        firstName: z.string().min(2, "First name must be at least 2 characters").optional(),
        lastName: z.string().min(2, "Last name must be at least 2 characters").optional(),
        email: z.string().email("Please enter a valid email").optional(),
        phone: z.string().min(10, "Phone number must be at least 10 digits").optional(),
      });

      const validatedData = updateProfileSchema.parse(req.body);

      if (Object.keys(validatedData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      // Check if email is being updated and if it's already taken
      if (validatedData.email) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser && existingUser.id !== req.params.id) {
          return res.status(400).json({ message: "Email is already taken" });
        }
      }

      const updatedUser = await storage.updateUser(req.params.id, validatedData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Change user password
  app.put("/api/users/:id/password", requireAuth, async (req, res) => {
    try {
      // Users can only change their own password
      if (req.params.id !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate request body with Zod
      const changePasswordSchema = z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(6, "New password must be at least 6 characters long")
          .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "Password must contain at least one letter and one number"),
      });

      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      // Get current user to verify current password
      const user = await storage.getUser(req.params.id);
      if (!user || !user.isActive) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      const updatedUser = await storage.updateUser(req.params.id, { password: hashedNewPassword });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Download user data
  app.get("/api/users/:id/data", requireAuth, async (req, res) => {
    try {
      // Users can only download their own data
      if (req.params.id !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's related data
      const orders = await storage.getOrdersByBuyer(req.params.id);
      const wishlist = await storage.getUserWishlist(req.params.id);
      const reviews = await storage.getReviewsBySeller(req.params.id);

      const userData = {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
        },
        orders: orders.length,
        wishlistItems: wishlist.length,
        reviews: reviews.length,
        exportedAt: new Date().toISOString(),
      };

      res.json(userData);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete user account
  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      // Users can only delete their own account or admins can delete any
      if (req.params.id !== req.session.userId && req.session.userRole !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Instead of hard delete, mark user as inactive
      const updatedUser = await storage.updateUser(req.params.id, { 
        isActive: false,
        email: `deleted_${Date.now()}_${user.email}` // Prevent email conflicts
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Destroy session if user is deleting their own account
      if (req.params.id === req.session.userId) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction error:', err);
          }
        });
      }

      res.json({ message: "Account deactivated successfully" });
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

  app.get("/api/products/pending", requireRole('admin'), async (req, res) => {
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

  app.post("/api/products", requireAuth, upload.single('image'), async (req, res) => {
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

  app.post("/api/products/:id/approve", requireRole('admin'), async (req, res) => {
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
  app.post("/api/orders", requireAuth, async (req, res) => {
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
  app.post("/api/payments/initialize", requireAuth, async (req, res) => {
    try {
      const { email, orderId } = req.body;
      
      if (!email || !orderId) {
        return res.status(400).json({ message: "Email and orderId are required" });
      }

      // Fetch order from storage to verify ownership and get correct amount
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Ensure order belongs to current user or user is admin
      if (order.buyerId !== req.session.userId && req.session.userRole !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Ensure order is not already paid
      if (order.status === 'paid') {
        return res.status(400).json({ message: "Order already paid" });
      }

      const amount = parseFloat(order.totalAmount);

      // Initialize Paystack payment with server-computed amount
      const paymentData = await initializePaystackPayment(amount, email, orderId);
      
      res.json(paymentData);
    } catch (error) {
      console.error('Payment initialization error:', error);
      res.status(500).json({ message: "Payment initialization failed" });
    }
  });

  app.post("/api/payments/verify", requireAuth, async (req, res) => {
    try {
      const { reference } = req.body;
      
      if (!reference) {
        return res.status(400).json({ message: "Payment reference is required" });
      }

      // Verify Paystack payment
      const paymentData = await verifyPaystackPayment(reference);
      
      if (!paymentData.status || paymentData.data?.status !== 'success') {
        return res.json({ success: false, message: "Payment not successful" });
      }

      const orderId = paymentData.data?.metadata?.orderId;
      if (!orderId) {
        return res.status(400).json({ message: "Invalid payment - no order ID" });
      }

      // Fetch order to verify payment details
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Ensure order belongs to current user or user is admin
      if (order.buyerId !== req.session.userId && req.session.userRole !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Prevent replay attacks - check if already paid with this reference
      if (order.status === 'paid' && order.paymentReference === reference) {
        return res.json({ success: true, message: "Payment already processed" });
      }

      if (order.status === 'paid') {
        return res.status(400).json({ message: "Order already paid with different reference" });
      }

      // Validate payment details
      const expectedAmountInKobo = parseFloat(order.totalAmount) * 100;
      const isPaymentValid = 
        paymentData.data?.amount === expectedAmountInKobo &&
        paymentData.data?.currency === 'GHS';

      if (!isPaymentValid) {
        return res.status(400).json({ 
          message: "Payment validation failed - amount or currency mismatch" 
        });
      }

      // Update order status atomically
      await storage.updateOrder(orderId, { 
        status: 'paid', 
        paymentReference: reference 
      });

      res.json({ success: true, message: "Payment verified and order updated" });
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ message: "Payment verification failed" });
    }
  });

  // Message routes
  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      // Infer senderId from authenticated session
      const messageData = {
        ...req.body,
        senderId: req.session.userId
      };
      const validatedData = insertMessageSchema.parse(messageData);
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/messages/:user1Id/:user2Id", requireAuth, async (req, res) => {
    try {
      const { user1Id, user2Id } = req.params;
      const productId = req.query.productId as string;
      const requestingUserId = req.session.userId;
      
      // Ensure the requesting user is a participant in the conversation
      if (requestingUserId !== user1Id && requestingUserId !== user2Id) {
        return res.status(403).json({ message: "Access denied. You can only view your own conversations." });
      }
      
      const messages = await storage.getMessagesBetweenUsers(user1Id, user2Id, productId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/messages/mark-read/:userId/:senderId", requireAuth, async (req, res) => {
    try {
      const { userId, senderId } = req.params;
      const productId = req.query.productId as string;
      const requestingUserId = req.session.userId;
      
      // Ensure the requesting user can only mark their own messages as read
      if (requestingUserId !== userId) {
        return res.status(403).json({ message: "Access denied. You can only mark your own messages as read." });
      }
      
      await storage.markMessagesAsRead(userId, senderId, productId);
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
  app.post("/api/reviews", requireAuth, async (req, res) => {
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
  app.post("/api/wishlist", requireAuth, async (req, res) => {
    try {
      const { productId } = req.body;
      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      const wishlistData = {
        userId: req.session.userId!,
        productId
      };

      const result = insertWishlistSchema.safeParse(wishlistData);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid wishlist data", errors: result.error.errors });
      }

      const wishlist = await storage.addToWishlist(result.data);
      res.status(201).json(wishlist);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/wishlist/:productId", requireAuth, async (req, res) => {
    try {
      const { productId } = req.params;
      const success = await storage.removeFromWishlist(req.session.userId!, productId);
      
      if (!success) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }

      res.json({ message: "Item removed from wishlist" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/wishlist", requireAuth, async (req, res) => {
    try {
      const wishlist = await storage.getUserWishlist(req.session.userId!);
      res.json(wishlist);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/wishlist/:productId/exists", requireAuth, async (req, res) => {
    try {
      const { productId } = req.params;
      const exists = await storage.isInWishlist(req.session.userId!, productId);
      res.json({ exists });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cart routes
  app.post("/api/cart", requireAuth, async (req, res) => {
    try {
      const { productId, quantity = 1, size } = req.body;
      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      // Validate product exists and is active
      const product = await storage.getProduct(productId);
      if (!product || !product.isActive || !product.isApproved) {
        return res.status(404).json({ message: "Product not found or unavailable" });
      }

      // Validate quantity
      if (quantity < 1 || quantity > 10) {
        return res.status(400).json({ message: "Quantity must be between 1 and 10" });
      }

      const cartItemData = {
        userId: req.session.userId!,
        productId,
        quantity,
        size
      };

      const result = insertCartItemSchema.safeParse(cartItemData);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid cart item data", errors: result.error.errors });
      }

      const cartItem = await storage.addToCart(result.data);
      res.status(201).json(cartItem);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/cart/:productId", requireAuth, async (req, res) => {
    try {
      const { productId } = req.params;
      const { quantity, size } = req.body;

      if (!size) {
        return res.status(400).json({ message: "Size is required for cart updates" });
      }

      if (quantity !== undefined && (quantity < 1 || quantity > 10)) {
        return res.status(400).json({ message: "Quantity must be between 1 and 10" });
      }

      const updatedItem = await storage.updateCartItem(req.session.userId!, productId, size, { quantity });
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Cart item not found for the specified product and size" });
      }

      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/cart/:productId", requireAuth, async (req, res) => {
    try {
      const { productId } = req.params;
      const { size } = req.query;
      
      if (!size) {
        return res.status(400).json({ message: "Size is required for cart removal" });
      }
      
      const success = await storage.removeFromCart(req.session.userId!, productId, size as string);
      
      if (!success) {
        return res.status(404).json({ message: "Cart item not found for the specified product and size" });
      }

      res.json({ message: "Item removed from cart" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/cart", requireAuth, async (req, res) => {
    try {
      const cart = await storage.getCart(req.session.userId!);
      res.json(cart);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/cart", requireAuth, async (req, res) => {
    try {
      await storage.clearCart(req.session.userId!);
      res.json({ message: "Cart cleared" });
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

  // AI Processing Routes
  app.post("/api/ai/remove-background", upload.single('image'), async (req, res) => {
    try {
      res.set('Content-Type', 'application/json');
      const { type, image_url } = req.body;
      
      if (!process.env.REMOVE_BG_API_KEY) {
        return res.status(500).json({ 
          success: false,
          message: "Remove.bg API key not configured" 
        });
      }

      let processedImageUrl: string;

      if (type === 'file' && req.file) {
        // Validate file
        if (req.file.size > 5 * 1024 * 1024) { // 5MB limit
          return res.status(400).json({
            success: false,
            message: "File size too large. Maximum size is 5MB."
          });
        }

        // Process uploaded file
        const formData = new FormData();
        const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
        formData.append('image_file', fileBlob);
        formData.append('size', 'auto');
        formData.append('format', 'auto');

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: {
            'X-Api-Key': process.env.REMOVE_BG_API_KEY,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Remove.bg API error:', errorText);
          return res.status(500).json({
            success: false,
            message: 'Background removal failed. Please try again.'
          });
        }

        const processedBuffer = await response.arrayBuffer();
        
        // Create a base64 data URL for now - in production this would be saved to storage
        const base64Image = Buffer.from(processedBuffer).toString('base64');
        processedImageUrl = `data:image/png;base64,${base64Image}`;
        
      } else if (type === 'url' && image_url) {
        // Process image from URL
        const formData = new FormData();
        formData.append('image_url', image_url);
        formData.append('size', 'auto');
        formData.append('format', 'auto');

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: {
            'X-Api-Key': process.env.REMOVE_BG_API_KEY,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Remove.bg API error:', errorText);
          return res.status(500).json({
            success: false,
            message: 'Background removal failed. Please try again.'
          });
        }

        const processedBuffer = await response.arrayBuffer();
        const base64Image = Buffer.from(processedBuffer).toString('base64');
        processedImageUrl = `data:image/png;base64,${base64Image}`;
      } else {
        return res.status(400).json({ 
          success: false,
          message: "Invalid request. Please provide either a file or image URL." 
        });
      }

      res.json({
        success: true,
        processedImageUrl,
        message: 'Background removed successfully'
      });

    } catch (error) {
      console.error('Background removal error:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Background removal failed'
      });
    }
  });

  // Mannequin overlay endpoint (placeholder for Fashn.ai)
  app.post("/api/ai/mannequin-overlay", async (req, res) => {
    try {
      res.set('Content-Type', 'application/json');
      const { imageUrl, garmentType, mannequinGender } = req.body;
      
      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: "Image URL is required"
        });
      }
      
      // Check if Fashn.ai API key is available
      if (!process.env.FASHN_AI_API_KEY || process.env.FASHN_AI_API_KEY.trim() === '') {
        // Return success with placeholder message for graceful fallback
        return res.status(200).json({ 
          success: true,
          processedImageUrl: imageUrl,
          message: "Fashn.ai API key not configured. Background removal completed - configure FASHN_AI_API_KEY to enable virtual try-on features."
        });
      }

      // Placeholder for actual Fashn.ai implementation
      console.log('Mannequin overlay requested:', { imageUrl, garmentType, mannequinGender });
      
      // TODO: In production, implement actual Fashn.ai API call:
      /*
      const response = await fetch('https://api.fashn.ai/v1/try-on', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FASHN_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          garment_image_url: imageUrl,
          mannequin_type: mannequinGender,
          garment_category: garmentType,
          output_format: 'jpg',
          quality: 'high',
        }),
      });

      if (!response.ok) {
        throw new Error('Fashn.ai API request failed');
      }

      const result = await response.json();
      return res.json({
        success: true,
        processedImageUrl: result.processedImageUrl,
        message: 'Virtual try-on completed successfully'
      });
      */
      
      // For now, return the same image (background-removed version) as placeholder
      res.json({
        success: true,
        processedImageUrl: imageUrl,
        message: 'Mannequin overlay placeholder - background removal completed. Configure Fashn.ai API key for virtual try-on.'
      });

    } catch (error) {
      console.error('Mannequin overlay error:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Mannequin overlay processing failed'
      });
    }
  });

  // Test endpoint for AI functionality
  app.get("/api/ai/test", async (req, res) => {
    try {
      const removeBgApiKey = process.env.REMOVE_BG_API_KEY;
      const fashnApiKey = process.env.FASHN_AI_API_KEY;
      
      res.json({
        status: "ok",
        removeBgConfigured: !!removeBgApiKey,
        fashnConfigured: !!fashnApiKey,
        removeBgKeyLength: removeBgApiKey ? removeBgApiKey.length : 0,
        message: "AI processing endpoints are ready"
      });
    } catch (error) {
      res.status(500).json({ error: "Test failed" });
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
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  
  console.log('Paystack Secret Key available:', !!paystackSecretKey);
  console.log('Paystack Secret Key length:', paystackSecretKey ? paystackSecretKey.length : 0);
  
  if (!paystackSecretKey || paystackSecretKey.trim() === '') {
    console.error('Paystack secret key issue - Key exists:', !!paystackSecretKey, 'Length:', paystackSecretKey ? paystackSecretKey.length : 0);
    throw new Error('Paystack secret key not configured');
  }

  try {
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
        reference: `kt_${Date.now()}_${orderId}`, // Add custom reference prefix
        metadata: {
          orderId,
          custom_fields: [
            {
              display_name: "Order ID",
              variable_name: "order_id", 
              value: orderId
            }
          ]
        },
        callback_url: `${process.env.BASE_URL || 'http://localhost:5000'}/api/payments/callback`
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Paystack API error:', data);
      throw new Error(data.message || 'Payment initialization failed');
    }

    return data;
  } catch (error) {
    console.error('Paystack initialization error:', error);
    throw error;
  }
}

async function verifyPaystackPayment(reference: string) {
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  
  if (!paystackSecretKey) {
    throw new Error('Paystack secret key not configured');
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Paystack verification API error:', data);
      throw new Error(data.message || 'Payment verification failed');
    }

    return data;
  } catch (error) {
    console.error('Paystack verification error:', error);
    throw error;
  }
}
