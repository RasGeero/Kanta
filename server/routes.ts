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
  insertCartItemSchema,
  insertFashionModelSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
// Conditionally import and configure Cloudinary
let cloudinary: any = null;
let cloudinaryLoadingPromise: Promise<void> | null = null;

if (process.env.CLOUDINARY_URL) {
  cloudinaryLoadingPromise = import('cloudinary').then(cloudinaryModule => {
    cloudinary = cloudinaryModule.v2;
    console.log('✅ Cloudinary configured successfully');
  }).catch(error => {
    console.warn('⚠️  Failed to load Cloudinary:', error.message);
    throw error;
  });
} else {
  console.warn('⚠️  CLOUDINARY_URL not set - image uploads will be disabled');
}

// Verify other environment variables at startup
const requiredEnvVars = {
  CLOUDINARY_URL: process.env.CLOUDINARY_URL,
  REMOVE_BG_API_KEY: process.env.REMOVE_BG_API_KEY,
  FASHN_AI_API_KEY: process.env.FASHN_AI_API_KEY,
};

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    console.error(`⚠️  ${key} environment variable is missing - AI processing may fail`);
  } else {
    console.log(`✅ ${key} configured successfully`);
  }
});

// Helper function to upload buffer to Cloudinary
async function uploadToCloudinary(buffer: Buffer, options: {
  folder?: string;
  public_id?: string;
  format?: string;
} = {}): Promise<string> {
  // Wait for Cloudinary to load if it's still loading
  if (cloudinaryLoadingPromise) {
    await cloudinaryLoadingPromise;
  }
  
  if (!cloudinary) {
    throw new Error('Cloudinary not configured - cannot upload images');
  }
  
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'image' as const,
      folder: options.folder || 'ai-processing',
      public_id: options.public_id || undefined,
      format: options.format || 'png',
      overwrite: true,
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error: any, result: any) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error('No result from Cloudinary upload'));
        }
      }
    ).end(buffer);
  });
}

// Helper function to convert data URL to buffer and upload to Cloudinary
async function handleDataUrlToCloudinary(dataUrl: string, publicIdPrefix: string): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl; // Return as-is if it's already a URL
  }

  // Extract base64 data from data URL
  const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+/]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }

  const [, format, base64Data] = matches;
  const buffer = Buffer.from(base64Data, 'base64');

  return await uploadToCloudinary(buffer, {
    folder: 'ai-processing/virtual-tryon',
    public_id: `${publicIdPrefix}-${Date.now()}`,
    format: format === 'jpeg' ? 'jpg' : format
  });
}

// Helper function to map garment types to Fashn.ai categories
function mapGarmentTypeToFashnCategory(garmentType: string): 'tops' | 'bottoms' | 'one-pieces' | 'auto' {
  const type = garmentType.toLowerCase();
  
  // Map various garment types to Fashn.ai categories
  if (type.includes('shirt') || type.includes('top') || type.includes('blouse') || 
      type.includes('tshirt') || type.includes('t-shirt') || type.includes('sweater') ||
      type.includes('hoodie') || type.includes('jacket') || type.includes('coat')) {
    return 'tops';
  }
  
  if (type.includes('pants') || type.includes('trouser') || type.includes('jeans') ||
      type.includes('shorts') || type.includes('skirt') || type.includes('leggings')) {
    return 'bottoms';
  }
  
  if (type.includes('dress') || type.includes('jumpsuit') || type.includes('romper') ||
      type.includes('onepiece') || type.includes('one-piece')) {
    return 'one-pieces';
  }
  
  // Default to auto for unknown categories
  return 'auto';
}

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
  // Initialize seed data only in development mode
  if (process.env.NODE_ENV === 'development' && process.env.ENABLE_SEEDING !== 'false') {
    await storage.initializeSeedDataIfEmpty();
  }

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

      // Temporary debugging for password hash
      console.log("Debug - Email:", email);
      console.log("Debug - Hash length:", user.password?.length);
      console.log("Debug - Hash starts with $2b$12$:", user.password?.startsWith("$2b$12$"));
      console.log("Debug - Hash first 10 chars:", user.password?.substring(0, 10));
      console.log("Debug - Hash last 10 chars:", user.password?.substring(-10));
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log("Debug - Password comparison result:", isValidPassword);
      
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

      let originalImageUrl = productData.originalImage;
      let processedImageUrl = productData.originalImage;

      if (req.file) {
        // Process image with sharp for basic optimization
        const processedImage = await sharp(req.file.buffer)
          .resize(800, 1000, { fit: 'cover' })
          .jpeg({ quality: 90 })
          .toBuffer();

        // Create base64 data URL for original image
        const base64Original = processedImage.toString('base64');
        originalImageUrl = `data:image/jpeg;base64,${base64Original}`;

        // Perform AI processing (background removal + virtual try-on)
        try {
          console.log('Starting AI processing for product creation...');

          // Step 1: Remove background
          const formData = new FormData();
          const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
          formData.append('image_file', fileBlob, req.file.originalname || 'image.jpg');
          formData.append('size', 'auto');
          formData.append('format', 'png');

          const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
              'X-Api-Key': process.env.REMOVE_BG_API_KEY!,
            },
            body: formData,
          });

          if (removeBgResponse.ok) {
            const processedBuffer = await removeBgResponse.arrayBuffer();
            const base64BgRemoved = Buffer.from(processedBuffer).toString('base64');
            const bgRemovedUrl = `data:image/png;base64,${base64BgRemoved}`;

            console.log('Background removal successful');

            // Step 2: Apply virtual try-on with Fashn.ai if available
            if (process.env.FASHN_AI_API_KEY && process.env.FASHN_AI_API_KEY.trim() !== '') {
              try {
                const garmentType = productData.category || 'other';
                const mannequinGender = productData.gender || 'unisex';

                // Call Fashn.ai virtual try-on directly
                const fashnResult = await processVirtualTryOn(bgRemovedUrl, garmentType, mannequinGender);

                if (fashnResult.success && fashnResult.processedImageUrl !== bgRemovedUrl) {
                  processedImageUrl = fashnResult.processedImageUrl;
                  console.log('Virtual try-on completed successfully');
                } else {
                  processedImageUrl = bgRemovedUrl;
                  console.log('Virtual try-on fallback to background removal:', fashnResult.message);
                }
              } catch (fashnError) {
                console.error('Virtual try-on error:', fashnError);
                processedImageUrl = bgRemovedUrl;
              }
            } else {
              processedImageUrl = bgRemovedUrl;
              console.log('No Fashn.ai key, using background removal only');
            }
          } else {
            console.error('Background removal failed, using original image');
            processedImageUrl = originalImageUrl;
          }
        } catch (aiError) {
          console.error('AI processing failed:', aiError);
          processedImageUrl = originalImageUrl;
        }
      }

      const product = await storage.createProduct({
        ...productData,
        sellerId: req.session.userId!, // Use authenticated user's ID from session
        originalImage: originalImageUrl,
        processedImage: processedImageUrl,
      });

      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error('Product creation error:', error);
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

  // Update product's selected fashion model
  app.patch("/api/products/:id/model", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updateModelSchema = z.object({
        modelId: z.string().min(1, "Model ID is required"),
        aiPreviewUrl: z.string().min(1).optional()
      });

      const { modelId, aiPreviewUrl: rawPreviewUrl } = updateModelSchema.parse(req.body);

      // Handle data URL conversion to Cloudinary if needed
      let aiPreviewUrl = rawPreviewUrl;
      if (rawPreviewUrl && rawPreviewUrl.startsWith('data:image/')) {
        try {
          aiPreviewUrl = await handleDataUrlToCloudinary(rawPreviewUrl, `ai-preview-${id}`);
        } catch (error) {
          console.error('Failed to upload AI preview to Cloudinary:', error);
          // Continue with original data URL as fallback
        }
      }

      // Verify the product exists and belongs to the user
      const existingProduct = await storage.getProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Check if user owns the product or is admin
      if (existingProduct.sellerId !== req.session.userId && req.session.userRole !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Verify the fashion model exists and is active
      const model = await storage.getFashionModel(modelId);
      if (!model || !model.isActive) {
        return res.status(400).json({ message: "Invalid or inactive fashion model" });
      }

      const updatedProduct = await storage.updateProductModel(id, modelId, aiPreviewUrl);

      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Return the product with seller details
      const productWithSeller = await storage.getProductWithSeller(id);

      if (!productWithSeller) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(productWithSeller);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error('Update product model error:', error);
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

        // Upload processed image to Cloudinary
        const buffer = Buffer.from(processedBuffer);
        processedImageUrl = await uploadToCloudinary(buffer, {
          folder: 'ai-processing/background-removed',
          public_id: `bg-removed-${Date.now()}`,
          format: 'png'
        });

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

        // Upload processed image to Cloudinary
        const buffer = Buffer.from(processedBuffer);
        processedImageUrl = await uploadToCloudinary(buffer, {
          folder: 'ai-processing/background-removed',
          public_id: `bg-removed-url-${Date.now()}`,
          format: 'png'
        });
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

  // Model overlay endpoint (placeholder for Fashn.ai)
  app.post("/api/ai/model-overlay", async (req, res) => {
    try {
      res.set('Content-Type', 'application/json');
      const { imageUrl, garmentType, modelGender, fashionModel } = req.body;

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

      // Implement actual Fashn.ai API call
      console.log('Model overlay requested:', { imageUrl, garmentType, modelGender });
      const processingStartTime = Date.now();
      let selectedModel = null; // Declare at function scope for error handling

      try {
        // Get appropriate fashion model from database using smart selection
        const allActiveFashionModels = await storage.getActiveFashionModels();

        // Normalize gender mapping to handle various input formats
        const g = (modelGender || 'unisex').toLowerCase();
        const genderFilter = ['women', 'female'].includes(g) ? 'women' : 
                            ['men', 'male'].includes(g) ? 'men' : 'unisex';

        let modelImageUrl;

        if (fashionModel && fashionModel.id) {
          // Use the provided fashion model from the client
          selectedModel = fashionModel; // IMPORTANT: Set selectedModel for success/error tracking
          modelImageUrl = fashionModel.imageUrl;
          console.log(`Using client-selected fashion model: ${fashionModel.name} (${fashionModel.gender})`);

          // Track analytics event (usage will be incremented in updateFashionModelMetrics)
          await storage.trackFashionModelEvent({
            modelId: fashionModel.id,
            eventType: 'ai_process',
            context: {
              garmentType,
              gender: modelGender,
              source: 'ai_studio'
            }
          });
        } else if (allActiveFashionModels.length > 0) {
          // Fall back to smart selection if no fashion model provided
          selectedModel = selectBestFashionModel(allActiveFashionModels, genderFilter, garmentType);

          if (selectedModel) {
            modelImageUrl = selectedModel.imageUrl;
            console.log(`Using smart-selected fashion model: ${selectedModel.name} (${selectedModel.gender}) for gender: ${modelGender}`);

            // Track analytics event (usage will be incremented in updateFashionModelMetrics)
            await storage.trackFashionModelEvent({
              modelId: selectedModel.id,
              eventType: 'ai_process',
              context: {
                garmentType,
                gender: modelGender,
                source: 'ai_studio'
              }
            });
          }
        }

        if (!selectedModel) {
          // Final fallback to Unsplash if no fashion models in database
          console.warn('No active fashion models found in database, using Unsplash fallback');
          const fallbackMaleUrl = "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=600&fit=crop&crop=face";
          modelImageUrl = modelGender === 'female' 
            ? "https://images.unsplash.com/photo-1551836022-8b2858c9c69b?w=400&h=600&fit=crop&crop=face" 
            : fallbackMaleUrl;
        }

        // Step 1: Submit job to Fashn.ai with enhanced debugging
        const apiKey = process.env.FASHN_AI_API_KEY;
        
        // Debug API key configuration (safely)
        console.log('[DEBUG] Fashn.ai API Key debug - Length:', apiKey ? apiKey.length : 0);
        console.log('[DEBUG] Fashn.ai API Key debug - Starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');
        console.log('[DEBUG] Fashn.ai API Key debug - Type:', typeof apiKey);
        
        const requestBody = {
          model_name: "tryon-v1.6",
          inputs: {
            model_image: modelImageUrl,
            garment_image: imageUrl,
            category: garmentType || "other"
          }
        };
        
        console.log('[DEBUG] Fashn.ai request body:', JSON.stringify(requestBody, null, 2));
        console.log('[DEBUG] Model image URL length:', modelImageUrl?.length || 0);
        console.log('[DEBUG] Garment image URL length:', imageUrl?.length || 0);
        
        const runResponse = await fetch('https://api.fashn.ai/v1/run', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        console.log('[DEBUG] Fashn.ai response status:', runResponse.status);
        console.log('[DEBUG] Fashn.ai response headers:', Object.fromEntries(runResponse.headers.entries()));

        if (!runResponse.ok) {
          let errorText;
          try {
            errorText = await runResponse.text();
            console.error('[DEBUG] Fashn.ai run API error (raw):', errorText);
            
            // Try to parse as JSON for better error details
            try {
              const errorJson = JSON.parse(errorText);
              console.error('[DEBUG] Fashn.ai run API error (parsed):', errorJson);
            } catch {
              console.error('[DEBUG] Error response is not JSON');
            }
          } catch (readError) {
            console.error('[DEBUG] Failed to read error response:', readError);
            errorText = 'Failed to read error response';
          }
          throw new Error(`Fashn.ai API request failed: ${runResponse.status}`);
        }

        const runResult = await runResponse.json();
        const predictionId = runResult.id;

        if (!predictionId) {
          throw new Error('No prediction ID returned from Fashn.ai');
        }

        console.log('Fashn.ai job submitted:', predictionId);

        // Step 2: Poll for completion (with timeout)
        const maxAttempts = 15; // 15 attempts * 4 seconds = 60 seconds max
        let attempts = 0;
        let finalResult = null;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 4000)); // Wait 4 seconds between polls
          attempts++;

          const statusResponse = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
            headers: {
              'Authorization': `Bearer ${process.env.FASHN_AI_API_KEY}`,
            },
          });

          if (!statusResponse.ok) {
            console.error('Fashn.ai status check failed:', statusResponse.status);
            continue;
          }

          const statusResult = await statusResponse.json();
          console.log(`Fashn.ai status check ${attempts}:`, statusResult.status);

          if (statusResult.status === 'completed' && statusResult.output && statusResult.output.length > 0) {
            finalResult = statusResult;
            break;
          } else if (statusResult.status === 'failed') {
            throw new Error(statusResult.error || 'Fashn.ai processing failed');
          }
        }

        if (!finalResult) {
          // Timeout - return background removed image as fallback
          console.warn('Fashn.ai processing timeout - using fallback');
          return res.json({
            success: true,
            processedImageUrl: imageUrl,
            message: 'Virtual try-on took too long. Using background-removed image.'
          });
        }

        // Success - return the virtual try-on result
        const processingEndTime = Date.now();
        const processingTime = processingEndTime - processingStartTime;

        // Track success metrics
        if (selectedModel) {
          await storage.updateFashionModelMetrics(selectedModel.id, true, processingTime);
        }

        return res.json({
          success: true,
          processedImageUrl: finalResult.output[0],
          message: 'Virtual try-on completed successfully'
        });

      } catch (error) {
        console.error('Fashn.ai processing error:', error);

        // Track failure metrics
        if (selectedModel) {
          const processingEndTime = Date.now();
          const processingTime = processingEndTime - processingStartTime;
          await storage.updateFashionModelMetrics(selectedModel.id, false, processingTime);
        }

        // Fallback to background-removed image
        return res.json({
          success: true,
          processedImageUrl: imageUrl,
          message: `Virtual try-on failed: ${error instanceof Error ? error.message : 'Unknown error'}. Using background-removed image.`
        });
      }

    } catch (error) {
      console.error('Model overlay error:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Model overlay processing failed'
      });
    }
  });

  // Fashion Model Management Routes

  // Get all fashion models with optional filtering
  app.get("/api/fashion-models", async (req, res) => {
    try {
      const { gender, bodyType, ethnicity, category, skinTone, tags, active, featured } = req.query;

      let fashionModels;

      // Check if we have search filters
      const hasFilters = gender || bodyType || ethnicity || category || skinTone || tags;

      if (hasFilters) {
        // Use search with filters
        const searchQuery: any = {};
        if (gender) searchQuery.gender = (gender as string).toLowerCase();
        if (bodyType) searchQuery.bodyType = (bodyType as string).toLowerCase();
        if (ethnicity) searchQuery.ethnicity = (ethnicity as string).toLowerCase();
        if (category) searchQuery.category = (category as string).toLowerCase();
        if (skinTone) searchQuery.skinTone = (skinTone as string).toLowerCase();
        if (tags) {
          // Handle tags as comma-separated string or array
          if (Array.isArray(tags)) {
            searchQuery.tags = tags as string[];
          } else {
            searchQuery.tags = (tags as string).split(',').map(tag => tag.trim()).filter(Boolean);
          }
        }

        fashionModels = await storage.searchFashionModels(searchQuery);

        // Apply active filter to search results if specified
        if (active === 'true') {
          fashionModels = fashionModels.filter(m => m.isActive);
        } else if (active === 'false') {
          fashionModels = fashionModels.filter(m => !m.isActive);
        }

        // Apply featured filter if specified
        if (featured === 'true') {
          fashionModels = fashionModels.filter(m => m.isFeatured);
        }
      } else {
        // No search filters, use appropriate get method
        if (featured === 'true') {
          fashionModels = await storage.getFeaturedFashionModels();
        } else if (active === 'true') {
          fashionModels = await storage.getActiveFashionModels();
        } else if (active === 'false') {
          // Get all and filter inactive
          const allFashionModels = await storage.getAllFashionModels();
          fashionModels = allFashionModels.filter(m => !m.isActive);
        } else {
          fashionModels = await storage.getAllFashionModels();
        }
      }

      res.json({ success: true, data: fashionModels });
    } catch (error) {
      console.error('Get fashion models error:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch fashion models' 
      });
    }
  });

  // Get recommended fashion models based on garment type and gender
  app.get("/api/fashion-models/recommended", async (req, res) => {
    try {
      const { garmentType, gender, limit } = req.query;

      // Validate required parameters
      if (!garmentType || !gender) {
        return res.status(400).json({ 
          success: false, 
          message: 'garmentType and gender are required parameters' 
        });
      }

      const limitNum = limit ? parseInt(limit as string, 10) : 3;

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 10) {
        return res.status(400).json({ 
          success: false, 
          message: 'limit must be a number between 1 and 10' 
        });
      }

      const recommendedModels = await storage.getRecommendedFashionModels(
        garmentType as string, 
        gender as string, 
        limitNum
      );

      res.json({ success: true, data: recommendedModels });
    } catch (error) {
      console.error('Get recommended fashion models error:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch recommended fashion models' 
      });
    }
  });

  // Get specific fashion model by ID
  app.get("/api/fashion-models/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ID parameter
      if (!id || id.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'Valid fashion model ID is required' 
        });
      }

      const fashionModel = await storage.getFashionModel(id);

      if (!fashionModel) {
        return res.status(404).json({ success: false, message: 'Fashion model not found' });
      }

      res.json({ success: true, data: fashionModel });
    } catch (error) {
      console.error('Get fashion model error:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch fashion model' 
      });
    }
  });

  // Create new fashion model (Admin only)
  app.post("/api/fashion-models", requireRole('admin'), upload.single('image'), async (req, res) => {
    try {
      // Parse and validate the request body
      let validatedData;
      try {
        // Custom boolean transformer for proper string-to-boolean conversion
        const booleanTransformer = z.preprocess((val) => {
          if (typeof val === 'boolean') return val;
          if (typeof val === 'string') {
            const lower = val.toLowerCase().trim();
            if (lower === 'true' || lower === '1' || lower === 'on' || lower === 'yes') return true;
            if (lower === 'false' || lower === '0' || lower === 'off' || lower === 'no') return false;
            if (lower === '') return undefined; // Empty strings should remain undefined for optional fields
          }
          return val;
        }, z.boolean().or(z.undefined()));

        // Create extended schema with image handling and explicit boolean handling
        const createFashionModelSchema = insertFashionModelSchema.extend({
          height: z.coerce.number().int().positive().optional(),
          sortOrder: z.coerce.number().int().optional(),
          isFeatured: booleanTransformer.optional(),
          hasTransparentBackground: booleanTransformer.optional(),
          isActive: booleanTransformer.optional(),
          tags: z.union([
            z.array(z.string()),
            z.string().transform((str) => {
              if (str.trim() === '') return [];
              try {
                const parsed = JSON.parse(str);
                return Array.isArray(parsed) ? parsed : [str];
              } catch {
                return str.split(',').map(tag => tag.trim()).filter(Boolean);
              }
            })
          ]).optional(),
        }).omit({ imageUrl: true, thumbnailUrl: true }); // We'll handle imageUrl separately

        validatedData = createFashionModelSchema.parse(req.body);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ 
            success: false, 
            message: 'Validation failed',
            errors: validationError.errors
          });
        }
        throw validationError;
      }

      // Handle image upload
      let imageUrl: string;
      let cloudinaryPublicId: string | undefined;

      if (req.file) {
        // Upload image to Cloudinary
        const buffer = req.file.buffer;
        const publicId = `fashion-model-${Date.now()}`;

        imageUrl = await uploadToCloudinary(buffer, {
          folder: 'fashion-models',
          public_id: publicId,
          format: 'png'
        });
        cloudinaryPublicId = publicId;
      } else if (req.body.imageUrl) {
        // Use provided image URL (validate it's a URL)
        const urlSchema = z.string().url();
        try {
          imageUrl = urlSchema.parse(req.body.imageUrl);
        } catch {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid image URL provided' 
          });
        }
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Either image file or imageUrl is required' 
        });
      }

      const fashionModelData = {
        ...validatedData,
        imageUrl,
        thumbnailUrl: imageUrl, // Use same image as thumbnail for now
        cloudinaryPublicId
      };

      const fashionModel = await storage.createFashionModel(fashionModelData);

      res.status(201).json({ success: true, data: fashionModel });
    } catch (error) {
      console.error('Create fashion model error:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create fashion model' 
      });
    }
  });

  // Update fashion model (Admin only)
  app.put("/api/fashion-models/:id", requireRole('admin'), upload.single('image'), async (req, res) => {
    try {
      const { id } = req.params;

      // Parse and validate the request body
      let validatedData;
      try {
        // Create update schema with image handling
        const updateFashionModelSchema = insertFashionModelSchema.partial().extend({
          height: z.coerce.number().int().positive().optional(),
          sortOrder: z.coerce.number().int().optional(),
          isFeatured: z.coerce.boolean().optional(),
          tags: z.union([
            z.array(z.string()),
            z.string().transform((str) => {
              if (str.trim() === '') return [];
              try {
                const parsed = JSON.parse(str);
                return Array.isArray(parsed) ? parsed : [str];
              } catch {
                return str.split(',').map(tag => tag.trim()).filter(Boolean);
              }
            })
          ]).optional(),
        }).omit({ imageUrl: true, thumbnailUrl: true }); // We'll handle imageUrl separately

        validatedData = updateFashionModelSchema.parse(req.body);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ 
            success: false, 
            message: 'Validation failed',
            errors: validationError.errors
          });
        }
        throw validationError;
      }

      // Handle image upload if provided
      if (req.file) {
        const buffer = req.file.buffer;
        const publicId = `fashion-model-${id}-${Date.now()}`;

        (validatedData as any).imageUrl = await uploadToCloudinary(buffer, {
          folder: 'fashion-models',
          public_id: publicId,
          format: 'png'
        });
        (validatedData as any).thumbnailUrl = (validatedData as any).imageUrl; // Use same as thumbnail
        (validatedData as any).cloudinaryPublicId = publicId;
      } else if (req.body.imageUrl) {
        // Validate provided URL
        const urlSchema = z.string().url();
        try {
          (validatedData as any).imageUrl = urlSchema.parse(req.body.imageUrl);
        } catch {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid image URL provided' 
          });
        }
      }

      const fashionModel = await storage.updateFashionModel(id, validatedData);

      if (!fashionModel) {
        return res.status(404).json({ success: false, message: 'Fashion model not found' });
      }

      res.json({ success: true, data: fashionModel });
    } catch (error) {
      console.error('Update fashion model error:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to update fashion model' 
      });
    }
  });

  // Delete fashion model (Admin only)
  app.delete("/api/fashion-models/:id", requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ID parameter
      if (!id || id.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'Valid fashion model ID is required' 
        });
      }

      const success = await storage.deleteFashionModel(id);

      if (!success) {
        return res.status(404).json({ success: false, message: 'Fashion model not found' });
      }

      res.json({ success: true, message: 'Fashion model deleted successfully' });
    } catch (error) {
      console.error('Delete fashion model error:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to delete fashion model' 
      });
    }
  });

  // Toggle fashion model active status (Admin only)
  app.patch("/api/fashion-models/:id/toggle", requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ID parameter
      if (!id || id.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'Valid fashion model ID is required' 
        });
      }

      // Validate and parse request body
      const toggleSchema = z.object({
        isActive: z.boolean()
      });

      let validatedData;
      try {
        validatedData = toggleSchema.parse(req.body);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ 
            success: false, 
            message: 'Validation failed: isActive must be a boolean',
            errors: validationError.errors
          });
        }
        throw validationError;
      }

      const success = await storage.toggleFashionModelStatus(id, validatedData.isActive);

      if (!success) {
        return res.status(404).json({ success: false, message: 'Fashion model not found' });
      }

      res.json({ 
        success: true, 
        message: `Fashion model ${validatedData.isActive ? 'activated' : 'deactivated'} successfully` 
      });
    } catch (error) {
      console.error('Toggle fashion model status error:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to toggle fashion model status' 
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

    // Simulate Fashn.ai API call for model overlay
    const fashnApiKey = process.env.FASHN_AI_API_KEY || "placeholder_fashn_key";
    console.log(`Processing model overlay with Fashn.ai: ${imageUrl}`);

    // In production, make actual API calls:
    // const removeResponse = await fetch('https://api.remove.bg/v1.0/removebg', { ... });
    // const fashnResponse = await fetch('https://api.fashn.ai/v1/try-on', { ... });

    return imageUrl; // Return processed image URL
  } catch (error) {
    console.error('AI processing error:', error);
    return imageUrl; // Return original on error
  }
}

// Smart fashion model selection function
function selectBestFashionModel(
  allFashionModels: any[], 
  preferredGender: string, 
  garmentType: string
): any | null {
  if (allFashionModels.length === 0) {
    return null;
  }

  // Enhanced scoring with analytics-driven metrics
  const scoredModels = allFashionModels.map(model => {
    let score = 0;

    // Gender matching (highest priority - 100 points)
    if (model.gender === preferredGender) {
      score += 100;
    } else if (model.gender === 'unisex') {
      score += 80; // Unisex is good fallback
    } else {
      score += 20; // Wrong gender gets low score
    }

    // Category matching (high priority - up to 60 points)
    const garmentCategory = mapGarmentToCategory(garmentType);
    if (model.category === garmentCategory) {
      score += 60; // Perfect category match gets more weight
    } else if (model.category === 'general') {
      score += 35; // General category is good fallback
    } else {
      // Partial match bonus for related categories
      const categoryBonus = getCategoryCompatibilityScore(model.category, garmentCategory);
      score += categoryBonus;
    }

    // Success rate bonus (high priority - up to 30 points)
    const successRate = Number(model.successRate || 0);
    if (successRate > 0) {
      score += (successRate / 100) * 30; // Scale 0-100% to 0-30 points
    }

    // Recent usage trend (medium priority - up to 25 points)
    const recentUsage = model.recentUsage || 0;
    const totalUsage = model.usage || 0;

    // Reward models with recent activity but not completely overused
    if (recentUsage > 0) {
      const recentUsageScore = Math.min(15, recentUsage * 2); // Cap at 15 points
      const diversityBonus = totalUsage > 50 ? -5 : 0; // Slight penalty for overused models
      score += recentUsageScore + diversityBonus;
    }

    // Featured status bonus (medium priority - 20 points)
    if (model.isFeatured) {
      score += 20;
    }

    // Total interactions bonus (lower priority - up to 15 points)
    const interactions = model.totalInteractions || 0;
    const interactionScore = Math.min(15, interactions * 0.1);
    score += interactionScore;

    // Sort order bonus (administrative priority - up to 15 points)
    score += Math.max(0, 15 - (model.sortOrder || 0));

    // Legacy usage bonus (minimal weight - up to 10 points)
    const legacyUsageBonus = Math.min(10, totalUsage * 0.05);
    score += legacyUsageBonus;

    // Small random factor for variety (reduced - 0-3 points)
    score += Math.random() * 3;

    return { model, score };
  });

  // Sort by score (highest first) and return the best match
  scoredModels.sort((a, b) => b.score - a.score);

  console.log(`Enhanced fashion model selection scores for ${preferredGender} ${garmentType}:`);
  scoredModels.slice(0, 3).forEach((item, index) => {
    const model = item.model;
    console.log(`  ${index + 1}. ${model.name} (${model.gender}, ${model.category}): ${item.score.toFixed(1)} [Success: ${model.successRate || 0}%, Recent: ${model.recentUsage || 0}, Total: ${model.usage || 0}]`);
  });

  return scoredModels[0]?.model || null;
}

// Helper function for category compatibility scoring
function getCategoryCompatibilityScore(modelCategory: string, garmentCategory: string): number {
  const compatibility: Record<string, Record<string, number>> = {
    'formal': { 'evening': 15, 'general': 10 },
    'evening': { 'formal': 15, 'general': 10 },
    'casual': { 'general': 15, 'athletic': 10 },
    'athletic': { 'casual': 10, 'general': 8 },
    'general': { 'formal': 10, 'evening': 10, 'casual': 10, 'athletic': 8 }
  };

  return compatibility[modelCategory]?.[garmentCategory] || 5; // Default small bonus
}

// Helper function to map garment types to categories
function mapGarmentToCategory(garmentType: string): string {
  const garment = (garmentType || '').toLowerCase();

  // Map common garment types to mannequin categories
  if (garment.includes('suit') || garment.includes('blazer') || garment.includes('formal')) {
    return 'formal';
  } else if (garment.includes('dress') || garment.includes('gown') || garment.includes('evening')) {
    return 'evening';
  } else if (garment.includes('sport') || garment.includes('gym') || garment.includes('athletic')) {
    return 'athletic';
  } else if (garment.includes('casual') || garment.includes('t-shirt') || garment.includes('jeans')) {
    return 'casual';
  }

  return 'general'; // Default fallback
}

// Virtual Try-On Processing Function  
async function processVirtualTryOn(
  imageUrl: string, 
  garmentType: string, 
  modelGender: string
): Promise<{ success: boolean; processedImageUrl: string; message: string }> {
  try {
    // Get appropriate fashion models from database with smart selection
    const allActiveFashionModels = await storage.getActiveFashionModels();

    // Normalize gender mapping to handle various input formats
    const g = (modelGender || 'unisex').toLowerCase();
    const genderFilter = ['women', 'female'].includes(g) ? 'women' : 
                        ['men', 'male'].includes(g) ? 'men' : 'unisex';

    // Smart fashion model selection based on garment type and gender
    const selectedFashionModel = selectBestFashionModel(allActiveFashionModels, genderFilter, garmentType);

    let modelImageUrl;
    if (selectedFashionModel) {
      modelImageUrl = selectedFashionModel.imageUrl;
      console.log(`Using fashion model: ${selectedFashionModel.name} (${selectedFashionModel.gender}, ${selectedFashionModel.category}) for gender: ${modelGender}, garment: ${garmentType}`);

      // Track usage of the selected model
      await storage.incrementFashionModelUsage(selectedFashionModel.id);
    } else {
      // This should not happen if fashion models are properly seeded
      console.error('No active fashion models found in database - this indicates a configuration issue');
      throw new Error('No fashion models available for AI try-on processing. Please contact support.');
    }

    // Convert data URL to proper URL using Cloudinary
    const garmentImageUrl = await handleDataUrlToCloudinary(imageUrl, 'garment');

    // Step 1: Submit job to Fashn.ai with enhanced debugging
    const apiKey = process.env.FASHN_AI_API_KEY;
    
    // Debug API key configuration (safely)
    console.log('Fashn.ai API Key debug - Length:', apiKey ? apiKey.length : 0);
    console.log('Fashn.ai API Key debug - Starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');
    console.log('Fashn.ai API Key debug - Type:', typeof apiKey);
    
    const requestBody = {
      model_name: "tryon-v1.6",
      inputs: {
        model_image: modelImageUrl,
        garment_image: garmentImageUrl,
        category: mapGarmentTypeToFashnCategory(garmentType || "other")
      }
    };
    
    console.log('Fashn.ai request body:', JSON.stringify(requestBody, null, 2));
    console.log('Model image URL length:', modelImageUrl?.length || 0);
    console.log('Garment image URL length:', garmentImageUrl?.length || 0);
    
    const runResponse = await fetch('https://api.fashn.ai/v1/run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('Fashn.ai response status:', runResponse.status);
    console.log('Fashn.ai response headers:', Object.fromEntries(runResponse.headers.entries()));

    if (!runResponse.ok) {
      let errorText;
      try {
        errorText = await runResponse.text();
        console.error('Fashn.ai run API error (raw):', errorText);
        
        // Try to parse as JSON for better error details
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Fashn.ai run API error (parsed):', errorJson);
        } catch {
          console.error('Error response is not JSON');
        }
      } catch (readError) {
        console.error('Failed to read error response:', readError);
        errorText = 'Failed to read error response';
      }
      throw new Error(`Fashn.ai API request failed: ${runResponse.status}`);
    }

    const runResult = await runResponse.json();
    const predictionId = runResult.id;

    if (!predictionId) {
      throw new Error('No prediction ID returned from Fashn.ai');
    }

    console.log('Fashn.ai job submitted:', predictionId);

    // Step 2: Poll for completion (with timeout)
    const maxAttempts = 15; // 15 attempts * 4 seconds = 60 seconds max
    let attempts = 0;
    let finalResult = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 4000)); // Wait 4 seconds between polls
      attempts++;

      const statusResponse = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.FASHN_AI_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        console.error('Fashn.ai status check failed:', statusResponse.status);
        continue;
      }

      const statusResult = await statusResponse.json();
      console.log(`Fashn.ai status check ${attempts}:`, statusResult.status);
      
      // Log the full response for debugging
      if (statusResult.status === 'failed') {
        console.error('Fashn.ai failed response:', JSON.stringify(statusResult, null, 2));
      }

      if (statusResult.status === 'completed' && statusResult.output && statusResult.output.length > 0) {
        finalResult = statusResult;
        break;
      } else if (statusResult.status === 'failed') {
        const errorMessage = typeof statusResult.error === 'string' 
          ? statusResult.error 
          : JSON.stringify(statusResult.error) || 'Fashn.ai processing failed';
        throw new Error(errorMessage);
      }
    }

    if (!finalResult) {
      // Timeout - return background removed image as fallback
      console.warn('Fashn.ai processing timeout - using fallback');
      return {
        success: true,
        processedImageUrl: imageUrl,
        message: 'Virtual try-on took too long. Using background-removed image.'
      };
    }

    // Success - return the virtual try-on result
    return {
      success: true,
      processedImageUrl: finalResult.output[0],
      message: 'Virtual try-on completed successfully'
    };

  } catch (error) {
    console.error('Fashn.ai processing error:', error);
    // Fallback to background-removed image
    return {
      success: true,
      processedImageUrl: imageUrl,
      message: `Virtual try-on failed: ${error instanceof Error ? error.message : 'Unknown error'}. Using background-removed image.`
    };
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