import { 
  type User, 
  type InsertUser, 
  type Product, 
  type InsertProduct,
  type ProductWithSeller,
  type Order,
  type InsertOrder,
  type OrderWithDetails,
  type Message,
  type InsertMessage,
  type Review,
  type InsertReview,
  type Wishlist,
  type InsertWishlist,
  type Report,
  type InsertReport,
  type CartItem,
  type InsertCartItem,
  type FashionModel,
  type InsertFashionModel,
  users,
  products,
  orders,
  messages,
  reviews,
  wishlist,
  reports,
  cartItems,
  fashionModels
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ilike, gte, lte, desc, asc, count, avg, sql } from "drizzle-orm";

// Extended cart types for storage
export type CartItemWithProduct = CartItem & {
  product: ProductWithSeller;
};

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Product operations
  getProduct(id: string): Promise<Product | undefined>;
  getProductWithSeller(id: string): Promise<ProductWithSeller | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  getProductsBySeller(sellerId: string): Promise<Product[]>;
  searchProducts(query: {
    search?: string;
    category?: string;
    size?: string;
    color?: string;
    gender?: string;
    maxPrice?: number;
    minPrice?: number;
    limit?: number;
    offset?: number;
  }): Promise<ProductWithSeller[]>;
  getFeaturedProducts(limit?: number): Promise<ProductWithSeller[]>;
  getPendingProducts(): Promise<ProductWithSeller[]>;
  approveProduct(id: string): Promise<boolean>;
  incrementProductViews(id: string): Promise<void>;
  
  // Order operations
  getOrder(id: string): Promise<Order | undefined>;
  getOrderWithDetails(id: string): Promise<OrderWithDetails | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;
  getOrdersByBuyer(buyerId: string): Promise<OrderWithDetails[]>;
  getOrdersBySeller(sellerId: string): Promise<OrderWithDetails[]>;
  getAllOrders(): Promise<OrderWithDetails[]>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBetweenUsers(user1Id: string, user2Id: string, productId?: string): Promise<Message[]>;
  markMessagesAsRead(userId: string, senderId: string, productId?: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
  
  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getReviewsBySeller(sellerId: string): Promise<Review[]>;
  getSellerAverageRating(sellerId: string): Promise<number>;
  
  // Wishlist operations
  addToWishlist(wishlist: InsertWishlist): Promise<Wishlist>;
  removeFromWishlist(userId: string, productId: string): Promise<boolean>;
  getUserWishlist(userId: string): Promise<ProductWithSeller[]>;
  isInWishlist(userId: string, productId: string): Promise<boolean>;
  
  // Cart operations
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItem(userId: string, productId: string, size: string, updates: { quantity?: number }): Promise<CartItem | undefined>;
  removeFromCart(userId: string, productId: string, size: string): Promise<boolean>;
  clearCart(userId: string): Promise<boolean>;
  getCart(userId: string): Promise<CartItemWithProduct[]>;

  // Report operations
  createReport(report: InsertReport): Promise<Report>;
  getReports(status?: string): Promise<Report[]>;
  updateReportStatus(id: string, status: string): Promise<boolean>;

  // Fashion Model operations
  getFashionModel(id: string): Promise<FashionModel | undefined>;
  getAllFashionModels(): Promise<FashionModel[]>;
  getActiveFashionModels(): Promise<FashionModel[]>;
  getFeaturedFashionModels(): Promise<FashionModel[]>;
  getFashionModelsByGender(gender: string): Promise<FashionModel[]>;
  searchFashionModels(query: {
    gender?: string;
    bodyType?: string;
    ethnicity?: string;
    category?: string;
    skinTone?: string;
    tags?: string[];
  }): Promise<FashionModel[]>;
  getRecommendedFashionModels(garmentType: string, gender: string, limit?: number): Promise<FashionModel[]>;
  createFashionModel(fashionModel: InsertFashionModel): Promise<FashionModel>;
  updateFashionModel(id: string, updates: Partial<FashionModel>): Promise<FashionModel | undefined>;
  deleteFashionModel(id: string): Promise<boolean>;
  toggleFashionModelStatus(id: string, isActive: boolean): Promise<boolean>;
  incrementFashionModelUsage(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Initialize the database with seed data if empty
  async initializeSeedDataIfEmpty(): Promise<void> {
    const userCount = await db.select({ count: count() }).from(users);
    if (userCount[0].count === 0) {
      // Insert seed data
      const seedUsers = [
        {
          username: "admin",
          email: "admin@kantamanto.com",
          password: "$2b$12$GdrNsN2xXGtiPfhLduT2Ee6QqrDRuGK1bpsRCSlyLitUwvy/FCF8q",
          firstName: "Admin",
          lastName: "User",
          phone: "+233123456789",
          role: "admin"
        },
        {
          username: "amas_closet",
          email: "ama@kantamanto.com",
          password: "$2b$12$GdrNsN2xXGtiPfhLduT2Ee6QqrDRuGK1bpsRCSlyLitUwvy/FCF8q",
          firstName: "Ama",
          lastName: "Asante",
          phone: "+233244567890",
          role: "seller"
        },
        {
          username: "kwakus_vintage",
          email: "kwaku@kantamanto.com",
          password: "$2b$12$GdrNsN2xXGtiPfhLduT2Ee6QqrDRuGK1bpsRCSlyLitUwvy/FCF8q",
          firstName: "Kwaku",
          lastName: "Mensah",
          phone: "+233208765432",
          role: "seller"
        },
        {
          username: "akosua_buyer",
          email: "akosua@gmail.com",
          password: "$2b$12$GdrNsN2xXGtiPfhLduT2Ee6QqrDRuGK1bpsRCSlyLitUwvy/FCF8q",
          firstName: "Akosua",
          lastName: "Osei",
          phone: "+233201234567",
          role: "buyer"
        }
      ];

      const insertedUsers = await db.insert(users).values(seedUsers).returning();
      const sellers = insertedUsers.filter(u => u.role === "seller");

      // Insert sample products
      const seedProducts = [
        {
          sellerId: sellers[0].id,
          title: "Beautiful African Print Dress",
          description: "Stunning kente-inspired dress perfect for special occasions. Made from high-quality fabric with vibrant colors.",
          category: "Dresses",
          size: "M",
          color: "Multi-color",
          gender: "women",
          condition: "excellent",
          price: "95.00",
          originalImage: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca",
          processedImage: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca",
          images: [],
          status: "approved",
          isApproved: true,
          views: 145
        },
        {
          sellerId: sellers[1].id,
          title: "Vintage Denim Jacket",
          description: "Classic denim jacket in excellent condition. Perfect for casual wear or layering.",
          category: "Jackets",
          size: "L",
          color: "Blue",
          gender: "unisex",
          condition: "good",
          price: "150.00",
          originalImage: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256",
          processedImage: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256",
          images: [],
          status: "approved",
          isApproved: true,
          views: 89
        },
        {
          sellerId: sellers[0].id,
          title: "Traditional Kente Shirt",
          description: "Authentic kente pattern shirt, perfect for cultural events and celebrations.",
          category: "Shirts",
          size: "L",
          color: "Gold/Black",
          gender: "men",
          condition: "excellent",
          price: "75.00",
          originalImage: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf",
          processedImage: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf",
          images: [],
          status: "approved",
          isApproved: true,
          views: 67
        }
      ];

      await db.insert(products).values(seedProducts);

      // Insert sample fashion models
      const seedFashionModels = [
        {
          name: "Marcus - Professional Model",
          imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face",
          thumbnailUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop&crop=face",
          cloudinaryPublicId: "fashion_model_marcus_professional",
          gender: "men",
          bodyType: "athletic",
          ethnicity: "caucasian",
          ageRange: "adult",
          pose: "front",
          category: "formal",
          height: 185,
          skinTone: "light",
          hairStyle: "short",
          hasTransparentBackground: true,
          isActive: true,
          isFeatured: true,
          sortOrder: 1,
          usage: 0,
          tags: ["professional", "business", "formal", "suit"]
        },
        {
          name: "Sophia - Elegant Model",
          imageUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b7cc?w=400&h=600&fit=crop&crop=face",
          thumbnailUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b7cc?w=200&h=300&fit=crop&crop=face",
          cloudinaryPublicId: "fashion_model_sophia_elegant",
          gender: "women",
          bodyType: "slim",
          ethnicity: "caucasian",
          ageRange: "adult",
          pose: "front",
          category: "general",
          height: 172,
          skinTone: "light",
          hairStyle: "long",
          hasTransparentBackground: true,
          isActive: true,
          isFeatured: true,
          sortOrder: 2,
          usage: 0,
          tags: ["elegant", "fashion", "versatile", "dress"]
        },
        {
          name: "Zara - Casual Lifestyle",
          imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=600&fit=crop&crop=face",
          thumbnailUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&h=300&fit=crop&crop=face",
          cloudinaryPublicId: "fashion_model_zara_casual",
          gender: "women",
          bodyType: "average",
          ethnicity: "african",
          ageRange: "adult",
          pose: "front",
          category: "casual",
          height: 168,
          skinTone: "dark",
          hairStyle: "medium",
          hasTransparentBackground: true,
          isActive: true,
          isFeatured: false,
          sortOrder: 3,
          usage: 0,
          tags: ["casual", "street-style", "everyday", "relaxed"]
        },
        {
          name: "David - Athletic Model",
          imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop&crop=face",
          thumbnailUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=300&fit=crop&crop=face",
          cloudinaryPublicId: "fashion_model_david_athletic",
          gender: "men",
          bodyType: "athletic",
          ethnicity: "caucasian",
          ageRange: "adult",
          pose: "front",
          category: "athletic",
          height: 180,
          skinTone: "medium",
          hairStyle: "short",
          hasTransparentBackground: true,
          isActive: true,
          isFeatured: false,
          sortOrder: 4,
          usage: 0,
          tags: ["athletic", "fitness", "sports", "casual"]
        },
        {
          name: "Maya - Evening Elegance",
          imageUrl: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=600&fit=crop&crop=face",
          thumbnailUrl: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=200&h=300&fit=crop&crop=face",
          cloudinaryPublicId: "fashion_model_maya_evening",
          gender: "women",
          bodyType: "slim",
          ethnicity: "asian",
          ageRange: "adult",
          pose: "front",
          category: "evening",
          height: 175,
          skinTone: "medium",
          hairStyle: "long",
          hasTransparentBackground: true,
          isActive: true,
          isFeatured: true,
          sortOrder: 5,
          usage: 0,
          tags: ["evening", "elegant", "formal", "gown"]
        },
        {
          name: "Alex - Unisex Model",
          imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop&crop=face",
          thumbnailUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=300&fit=crop&crop=face",
          cloudinaryPublicId: "fashion_model_alex_unisex",
          gender: "unisex",
          bodyType: "slim",
          ethnicity: "diverse",
          ageRange: "adult",
          pose: "front",
          category: "general",
          height: 170,
          skinTone: "medium",
          hairStyle: "short",
          hasTransparentBackground: true,
          isActive: true,
          isFeatured: false,
          sortOrder: 6,
          usage: 0,
          tags: ["unisex", "versatile", "modern", "trendy"]
        }
      ];

      await db.insert(fashionModels).values(seedFashionModels);
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  // Product operations
  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductWithSeller(id: string): Promise<ProductWithSeller | undefined> {
    const productData = await db
      .select({
        product: products,
        seller: users
      })
      .from(products)
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.id, id))
      .limit(1);

    if (productData.length === 0) return undefined;

    const { product, seller } = productData[0];

    // Get seller rating
    const ratingData = await db
      .select({
        avgRating: avg(reviews.rating),
        count: count(reviews.id)
      })
      .from(reviews)
      .where(eq(reviews.reviewedId, seller.id));

    const averageRating = ratingData[0].avgRating ? Number(ratingData[0].avgRating) : 0;
    const reviewCount = Number(ratingData[0].count);

    return {
      ...product,
      seller,
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount
    };
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values({
      ...insertProduct,
      images: insertProduct.images || []
    }).returning();
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getProductsBySeller(sellerId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.sellerId, sellerId));
  }

  async searchProducts(query: {
    search?: string;
    category?: string;
    size?: string;
    color?: string;
    gender?: string;
    maxPrice?: number;
    minPrice?: number;
    limit?: number;
    offset?: number;
  }): Promise<ProductWithSeller[]> {
    let whereConditions = [eq(products.isActive, true), eq(products.isApproved, true)];

    if (query.search) {
      whereConditions.push(
        sql`(${products.title} ILIKE ${'%' + query.search + '%'} OR ${products.description} ILIKE ${'%' + query.search + '%'} OR ${products.category} ILIKE ${'%' + query.search + '%'})`
      );
    }

    if (query.category && query.category !== 'All Categories') {
      whereConditions.push(eq(products.category, query.category));
    }

    if (query.size && query.size !== 'Any Size') {
      whereConditions.push(eq(products.size, query.size));
    }

    if (query.color) {
      whereConditions.push(ilike(products.color, `%${query.color}%`));
    }

    if (query.gender && query.gender !== 'all') {
      whereConditions.push(
        sql`(${products.gender} = ${query.gender} OR ${products.gender} = 'unisex')`
      );
    }

    if (query.minPrice !== undefined) {
      whereConditions.push(gte(sql`CAST(${products.price} AS DECIMAL)`, query.minPrice));
    }

    if (query.maxPrice !== undefined) {
      whereConditions.push(lte(sql`CAST(${products.price} AS DECIMAL)`, query.maxPrice));
    }

    const productData = await db
      .select({
        product: products,
        seller: users
      })
      .from(products)
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(and(...whereConditions))
      .limit(query.limit || 20)
      .offset(query.offset || 0);

    const result: ProductWithSeller[] = [];
    for (const { product, seller } of productData) {
      const ratingData = await db
        .select({
          avgRating: avg(reviews.rating),
          count: count(reviews.id)
        })
        .from(reviews)
        .where(eq(reviews.reviewedId, seller.id));

      const averageRating = ratingData[0].avgRating ? Number(ratingData[0].avgRating) : 0;
      const reviewCount = Number(ratingData[0].count);

      result.push({
        ...product,
        seller,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount
      });
    }

    return result;
  }

  async getFeaturedProducts(limit: number = 8): Promise<ProductWithSeller[]> {
    const productData = await db
      .select({
        product: products,
        seller: users
      })
      .from(products)
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(and(eq(products.isActive, true), eq(products.isApproved, true)))
      .orderBy(desc(products.views))
      .limit(limit);

    const result: ProductWithSeller[] = [];
    for (const { product, seller } of productData) {
      const ratingData = await db
        .select({
          avgRating: avg(reviews.rating),
          count: count(reviews.id)
        })
        .from(reviews)
        .where(eq(reviews.reviewedId, seller.id));

      const averageRating = ratingData[0].avgRating ? Number(ratingData[0].avgRating) : 0;
      const reviewCount = Number(ratingData[0].count);

      result.push({
        ...product,
        seller,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount
      });
    }

    return result;
  }

  async getPendingProducts(): Promise<ProductWithSeller[]> {
    const productData = await db
      .select({
        product: products,
        seller: users
      })
      .from(products)
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(and(eq(products.isActive, true), eq(products.isApproved, false)));

    return productData.map(({ product, seller }) => ({ ...product, seller }));
  }

  async approveProduct(id: string): Promise<boolean> {
    const result = await db
      .update(products)
      .set({ isApproved: true })
      .where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async incrementProductViews(id: string): Promise<void> {
    await db
      .update(products)
      .set({ views: sql`${products.views} + 1` })
      .where(eq(products.id, id));
  }

  // Order operations
  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderWithDetails(id: string): Promise<OrderWithDetails | undefined> {
    const orderData = await db
      .select({
        order: orders,
        buyer: { ...users, id: users.id },
        seller: users,
        product: products
      })
      .from(orders)
      .innerJoin(users, eq(orders.buyerId, users.id))
      .innerJoin(sql`${users} AS seller_user`, eq(orders.sellerId, sql`seller_user.id`))
      .innerJoin(products, eq(orders.productId, products.id))
      .where(eq(orders.id, id))
      .limit(1);

    if (orderData.length === 0) return undefined;

    const { order, buyer, seller, product } = orderData[0];
    return { ...order, buyer, seller, product };
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async getOrdersByBuyer(buyerId: string): Promise<OrderWithDetails[]> {
    const orderData = await db
      .select({
        order: orders,
        buyer: users,
        seller: sql`seller_user.*`,
        product: products
      })
      .from(orders)
      .innerJoin(users, eq(orders.buyerId, users.id))
      .innerJoin(sql`${users} AS seller_user`, eq(orders.sellerId, sql`seller_user.id`))
      .innerJoin(products, eq(orders.productId, products.id))
      .where(eq(orders.buyerId, buyerId));

    return orderData.map(({ order, buyer, seller, product }) => ({
      ...order,
      buyer,
      seller: seller as User,
      product
    }));
  }

  async getOrdersBySeller(sellerId: string): Promise<OrderWithDetails[]> {
    const orderData = await db
      .select({
        order: orders,
        buyer: sql`buyer_user.*`,
        seller: users,
        product: products
      })
      .from(orders)
      .innerJoin(sql`${users} AS buyer_user`, eq(orders.buyerId, sql`buyer_user.id`))
      .innerJoin(users, eq(orders.sellerId, users.id))
      .innerJoin(products, eq(orders.productId, products.id))
      .where(eq(orders.sellerId, sellerId));

    return orderData.map(({ order, buyer, seller, product }) => ({
      ...order,
      buyer: buyer as User,
      seller,
      product
    }));
  }

  async getAllOrders(): Promise<OrderWithDetails[]> {
    const orderData = await db
      .select({
        order: orders,
        buyer: sql`buyer_user.*`,
        seller: sql`seller_user.*`,
        product: products
      })
      .from(orders)
      .innerJoin(sql`${users} AS buyer_user`, eq(orders.buyerId, sql`buyer_user.id`))
      .innerJoin(sql`${users} AS seller_user`, eq(orders.sellerId, sql`seller_user.id`))
      .innerJoin(products, eq(orders.productId, products.id));

    return orderData.map(({ order, buyer, seller, product }) => ({
      ...order,
      buyer: buyer as User,
      seller: seller as User,
      product
    }));
  }

  // Message operations
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getMessagesBetweenUsers(user1Id: string, user2Id: string, productId?: string): Promise<Message[]> {
    let whereConditions = [
      sql`((${messages.senderId} = ${user1Id} AND ${messages.receiverId} = ${user2Id}) OR (${messages.senderId} = ${user2Id} AND ${messages.receiverId} = ${user1Id}))`
    ];

    if (productId) {
      whereConditions.push(eq(messages.productId, productId));
    }

    return db
      .select()
      .from(messages)
      .where(and(...whereConditions))
      .orderBy(asc(messages.createdAt));
  }

  async markMessagesAsRead(userId: string, senderId: string, productId?: string): Promise<void> {
    let whereConditions = [
      eq(messages.receiverId, userId),
      eq(messages.senderId, senderId),
      eq(messages.isRead, false)
    ];

    if (productId) {
      whereConditions.push(eq(messages.productId, productId));
    }

    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(...whereConditions));
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.receiverId, userId), eq(messages.isRead, false)));

    return Number(result[0].count);
  }

  // Review operations
  async createReview(insertReview: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(insertReview).returning();
    return review;
  }

  async getReviewsBySeller(sellerId: string): Promise<Review[]> {
    return db
      .select()
      .from(reviews)
      .where(eq(reviews.reviewedId, sellerId))
      .orderBy(desc(reviews.createdAt));
  }

  async getSellerAverageRating(sellerId: string): Promise<number> {
    const result = await db
      .select({ avgRating: avg(reviews.rating) })
      .from(reviews)
      .where(eq(reviews.reviewedId, sellerId));

    const rating = result[0].avgRating ? Number(result[0].avgRating) : 0;
    return Math.round(rating * 10) / 10;
  }

  // Wishlist operations
  async addToWishlist(insertWishlist: InsertWishlist): Promise<Wishlist> {
    const [wishlistItem] = await db.insert(wishlist).values(insertWishlist).returning();
    return wishlistItem;
  }

  async removeFromWishlist(userId: string, productId: string): Promise<boolean> {
    const result = await db
      .delete(wishlist)
      .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getUserWishlist(userId: string): Promise<ProductWithSeller[]> {
    const wishlistData = await db
      .select({
        product: products,
        seller: users
      })
      .from(wishlist)
      .innerJoin(products, eq(wishlist.productId, products.id))
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(eq(wishlist.userId, userId));

    const result: ProductWithSeller[] = [];
    for (const { product, seller } of wishlistData) {
      const ratingData = await db
        .select({
          avgRating: avg(reviews.rating),
          count: count(reviews.id)
        })
        .from(reviews)
        .where(eq(reviews.reviewedId, seller.id));

      const averageRating = ratingData[0].avgRating ? Number(ratingData[0].avgRating) : 0;
      const reviewCount = Number(ratingData[0].count);

      result.push({
        ...product,
        seller,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount
      });
    }

    return result;
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const result = await db
      .select({ count: count() })
      .from(wishlist)
      .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)));

    return Number(result[0].count) > 0;
  }

  // Cart operations
  async addToCart(insertCartItem: InsertCartItem): Promise<CartItem> {
    // Check if item already exists
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.userId, insertCartItem.userId),
          eq(cartItems.productId, insertCartItem.productId),
          eq(cartItems.size, insertCartItem.size || '')
        )
      );

    if (existingItem) {
      // Update quantity
      const [updatedItem] = await db
        .update(cartItems)
        .set({ quantity: existingItem.quantity + (insertCartItem.quantity || 1) })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return updatedItem;
    } else {
      // Create new item
      const [newItem] = await db.insert(cartItems).values(insertCartItem).returning();
      return newItem;
    }
  }

  async updateCartItem(userId: string, productId: string, size: string, updates: { quantity?: number }): Promise<CartItem | undefined> {
    const [item] = await db
      .update(cartItems)
      .set(updates)
      .where(
        and(
          eq(cartItems.userId, userId),
          eq(cartItems.productId, productId),
          eq(cartItems.size, size)
        )
      )
      .returning();
    return item || undefined;
  }

  async removeFromCart(userId: string, productId: string, size: string): Promise<boolean> {
    const result = await db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.userId, userId),
          eq(cartItems.productId, productId),
          eq(cartItems.size, size)
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  async clearCart(userId: string): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.userId, userId));
    return (result.rowCount ?? 0) > 0;
  }

  async getCart(userId: string): Promise<CartItemWithProduct[]> {
    const cartData = await db
      .select({
        cartItem: cartItems,
        product: products,
        seller: users
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(and(
        eq(cartItems.userId, userId),
        eq(products.isActive, true),
        eq(products.isApproved, true)
      ));

    const result: CartItemWithProduct[] = [];
    for (const { cartItem, product, seller } of cartData) {
      const ratingData = await db
        .select({
          avgRating: avg(reviews.rating),
          count: count(reviews.id)
        })
        .from(reviews)
        .where(eq(reviews.reviewedId, seller.id));

      const averageRating = ratingData[0].avgRating ? Number(ratingData[0].avgRating) : 0;
      const reviewCount = Number(ratingData[0].count);

      result.push({
        ...cartItem,
        product: {
          ...product,
          seller,
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount
        }
      });
    }

    return result;
  }

  // Report operations
  async createReport(insertReport: InsertReport): Promise<Report> {
    const [report] = await db.insert(reports).values(insertReport).returning();
    return report;
  }

  async getReports(status?: string): Promise<Report[]> {
    if (status) {
      return db.select().from(reports).where(eq(reports.status, status)).orderBy(desc(reports.createdAt));
    }
    return db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async updateReportStatus(id: string, status: string): Promise<boolean> {
    const result = await db.update(reports).set({ status }).where(eq(reports.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Fashion Model operations
  async getFashionModel(id: string): Promise<FashionModel | undefined> {
    const [fashionModel] = await db.select().from(fashionModels).where(eq(fashionModels.id, id));
    return fashionModel || undefined;
  }

  async getAllFashionModels(): Promise<FashionModel[]> {
    return db.select().from(fashionModels).orderBy(asc(fashionModels.sortOrder), desc(fashionModels.createdAt));
  }

  async getActiveFashionModels(): Promise<FashionModel[]> {
    return db
      .select()
      .from(fashionModels)
      .where(eq(fashionModels.isActive, true))
      .orderBy(asc(fashionModels.sortOrder), desc(fashionModels.createdAt));
  }

  async getFeaturedFashionModels(): Promise<FashionModel[]> {
    return db
      .select()
      .from(fashionModels)
      .where(and(eq(fashionModels.isActive, true), eq(fashionModels.isFeatured, true)))
      .orderBy(asc(fashionModels.sortOrder), desc(fashionModels.usage));
  }

  async getFashionModelsByGender(gender: string): Promise<FashionModel[]> {
    return db
      .select()
      .from(fashionModels)
      .where(and(
        eq(fashionModels.isActive, true),
        sql`(${fashionModels.gender} = ${gender} OR ${fashionModels.gender} = 'unisex')`
      ))
      .orderBy(asc(fashionModels.sortOrder), desc(fashionModels.createdAt));
  }

  async searchFashionModels(query: {
    gender?: string;
    bodyType?: string;
    ethnicity?: string;
    category?: string;
    skinTone?: string;
    tags?: string[];
  }): Promise<FashionModel[]> {
    let conditions = [eq(fashionModels.isActive, true)];

    if (query.gender) {
      conditions.push(
        sql`(${fashionModels.gender} = ${query.gender} OR ${fashionModels.gender} = 'unisex')`
      );
    }

    if (query.bodyType) {
      conditions.push(eq(fashionModels.bodyType, query.bodyType));
    }

    if (query.ethnicity) {
      conditions.push(eq(fashionModels.ethnicity, query.ethnicity));
    }

    if (query.category) {
      conditions.push(eq(fashionModels.category, query.category));
    }

    if (query.skinTone) {
      conditions.push(eq(fashionModels.skinTone, query.skinTone));
    }

    // Note: Tags filtering would require JSON operators in production
    // For now, we'll skip complex tag filtering in database implementation

    return db.select().from(fashionModels)
      .where(and(...conditions))
      .orderBy(asc(fashionModels.sortOrder), desc(fashionModels.createdAt));
  }

  async getRecommendedFashionModels(garmentType: string, gender: string, limit: number = 3): Promise<FashionModel[]> {
    // Smart recommendation based on garment type and gender
    const categoryMap: Record<string, string> = {
      'dress': 'evening',
      'shirt': 'formal',
      'pants': 'casual',
      'jacket': 'formal',
      'suit': 'formal',
      'athletic': 'athletic',
      'casual': 'casual'
    };

    const preferredCategory = categoryMap[garmentType.toLowerCase()] || 'general';
    
    return db
      .select()
      .from(fashionModels)
      .where(and(
        eq(fashionModels.isActive, true),
        sql`(${fashionModels.gender} = ${gender} OR ${fashionModels.gender} = 'unisex')`,
        sql`(${fashionModels.category} = ${preferredCategory} OR ${fashionModels.category} = 'general')`
      ))
      .orderBy(
        sql`CASE WHEN ${fashionModels.category} = ${preferredCategory} THEN 0 ELSE 1 END`,
        sql`CASE WHEN ${fashionModels.isFeatured} = true THEN 0 ELSE 1 END`,
        asc(fashionModels.sortOrder),
        desc(fashionModels.usage)
      )
      .limit(limit);
  }

  async createFashionModel(insertFashionModel: InsertFashionModel): Promise<FashionModel> {
    const [fashionModel] = await db.insert(fashionModels).values({
      ...insertFashionModel,
      tags: [...(insertFashionModel.tags ?? [])]
    }).returning();
    return fashionModel;
  }

  async updateFashionModel(id: string, updates: Partial<FashionModel>): Promise<FashionModel | undefined> {
    const [fashionModel] = await db
      .update(fashionModels)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(fashionModels.id, id))
      .returning();
    return fashionModel || undefined;
  }

  async deleteFashionModel(id: string): Promise<boolean> {
    const result = await db.delete(fashionModels).where(eq(fashionModels.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async toggleFashionModelStatus(id: string, isActive: boolean): Promise<boolean> {
    const result = await db
      .update(fashionModels)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(fashionModels.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async incrementFashionModelUsage(id: string): Promise<void> {
    await db
      .update(fashionModels)
      .set({ usage: sql`${fashionModels.usage} + 1`, updatedAt: new Date() })
      .where(eq(fashionModels.id, id));
  }
}

export const storage = new DatabaseStorage();