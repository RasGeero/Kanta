import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("buyer"), // buyer, seller, admin
  profileImage: text("profile_image"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  size: text("size"),
  color: text("color"),
  gender: text("gender"), // men, women, unisex
  condition: text("condition").notNull(), // excellent, good, fair
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalImage: text("original_image"), // Original uploaded image
  processedImage: text("processed_image"), // AI-processed image with mannequin
  images: json("images").$type<string[]>().notNull().default(sql`'[]'::json`), // Additional images
  isActive: boolean("is_active").default(true),
  isApproved: boolean("is_approved").default(false),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").default(1),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  status: text("status").notNull().default("pending"), // pending, paid, processing, shipped, delivered, cancelled
  paymentMethod: text("payment_method"), // paystack, mobile_money
  paymentReference: text("payment_reference"),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryCity: text("delivery_city").notNull(),
  deliveryRegion: text("delivery_region").notNull(),
  buyerPhone: text("buyer_phone").notNull(),
  buyerName: text("buyer_name").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  productId: varchar("product_id").references(() => products.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  reviewedId: varchar("reviewed_id").notNull().references(() => users.id), // seller being reviewed
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const wishlist = pgTable("wishlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  reportedUserId: varchar("reported_user_id").references(() => users.id),
  reportedProductId: varchar("reported_product_id").references(() => products.id),
  type: text("type").notNull(), // inappropriate_content, fraud, spam, other
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // open, in_progress, resolved, closed
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  size: text("size"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const userNotificationSettings = pgTable("user_notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  emailOrderUpdates: boolean("email_order_updates").default(true),
  emailPromotions: boolean("email_promotions").default(true),
  emailMessages: boolean("email_messages").default(true),
  smsOrderUpdates: boolean("sms_order_updates").default(false),
  smsPromotions: boolean("sms_promotions").default(false),
  smsDeliveryUpdates: boolean("sms_delivery_updates").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const userSecuritySettings = pgTable("user_security_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"), // TOTP secret
  passwordChangedAt: timestamp("password_changed_at"),
  loginNotifications: boolean("login_notifications").default(true),
  accountLockout: boolean("account_lockout").default(false),
  lockoutUntil: timestamp("lockout_until"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const userPrivacySettings = pgTable("user_privacy_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  profileVisibility: text("profile_visibility").default("public"), // public, private, sellers_only
  showOnlineStatus: boolean("show_online_status").default(true),
  allowDirectMessages: boolean("allow_direct_messages").default(true),
  shareDataWithPartners: boolean("share_data_with_partners").default(false),
  marketingEmails: boolean("marketing_emails").default(true),
  activityTracking: boolean("activity_tracking").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  views: true,
  isApproved: true 
});
export const insertOrderSchema = createInsertSchema(orders).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertWishlistSchema = createInsertSchema(wishlist).omit({ id: true, createdAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Wishlist = typeof wishlist.$inferSelect;
export type InsertWishlist = z.infer<typeof insertWishlistSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

// Extended types with relations
export type ProductWithSeller = Product & {
  seller: User;
  averageRating?: number;
  reviewCount?: number;
};

export type OrderWithDetails = Order & {
  buyer: User;
  seller: User;
  product: Product;
};

export type CartItemWithProduct = CartItem & {
  product: ProductWithSeller;
};
