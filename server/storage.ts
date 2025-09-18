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
  users,
  products,
  orders,
  messages,
  reviews,
  wishlist,
  reports,
  cartItems
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ilike, gte, lte, desc, asc, count, avg, sql } from "drizzle-orm";

// Extended cart types for storage
export type CartItemWithProduct = CartItem & {
  product: ProductWithSeller;
};
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private products: Map<string, Product> = new Map();
  private orders: Map<string, Order> = new Map();
  private messages: Map<string, Message> = new Map();
  private reviews: Map<string, Review> = new Map();
  private wishlist: Map<string, Wishlist> = new Map();
  private reports: Map<string, Report> = new Map();
  private cartItems: Map<string, CartItem> = new Map();

  constructor() {
    this.initializeSeedData();
  }

  private initializeSeedData() {
    // Create sample admin user
    const adminId = randomUUID();
    const admin: User = {
      id: adminId,
      username: "admin",
      email: "admin@kantamanto.com",
      password: "hashed_admin_password",
      firstName: "Admin",
      lastName: "User",
      phone: "+233123456789",
      role: "admin",
      profileImage: null,
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(adminId, admin);

    // Create sample sellers
    const sellerId1 = randomUUID();
    const seller1: User = {
      id: sellerId1,
      username: "amas_closet",
      email: "ama@kantamanto.com",
      password: "hashed_password",
      firstName: "Ama",
      lastName: "Asante",
      phone: "+233244567890",
      role: "seller",
      profileImage: null,
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(sellerId1, seller1);

    const sellerId2 = randomUUID();
    const seller2: User = {
      id: sellerId2,
      username: "kwakus_vintage",
      email: "kwaku@kantamanto.com",
      password: "hashed_password",
      firstName: "Kwaku",
      lastName: "Mensah",
      phone: "+233208765432",
      role: "seller",
      profileImage: null,
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(sellerId2, seller2);

    // Create sample buyers
    const buyerId1 = randomUUID();
    const buyer1: User = {
      id: buyerId1,
      username: "akosua_buyer",
      email: "akosua@gmail.com",
      password: "hashed_password",
      firstName: "Akosua",
      lastName: "Osei",
      phone: "+233201234567",
      role: "buyer",
      profileImage: null,
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(buyerId1, buyer1);

    // Create sample products
    const productId1 = randomUUID();
    const product1: Product = {
      id: productId1,
      sellerId: sellerId1,
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
      isActive: true,
      isApproved: true,
      views: 145,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.set(productId1, product1);

    const productId2 = randomUUID();
    const product2: Product = {
      id: productId2,
      sellerId: sellerId2,
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
      isActive: true,
      isApproved: true,
      views: 89,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.set(productId2, product2);

    // Add more sample products
    const productId3 = randomUUID();
    const product3: Product = {
      id: productId3,
      sellerId: sellerId1,
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
      isActive: true,
      isApproved: true,
      views: 67,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.set(productId3, product3);

    const productId4 = randomUUID();
    const product4: Product = {
      id: productId4,
      sellerId: sellerId2,
      title: "Colorful Wrap Dress",
      description: "Bright and cheerful wrap dress in African print. Comfortable and stylish for everyday wear.",
      category: "Dresses",
      size: "S",
      color: "Multi-color",
      gender: "women",
      condition: "good",
      price: "110.00",
      originalImage: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446",
      processedImage: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446",
      images: [],
      isActive: true,
      isApproved: true,
      views: 123,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.set(productId4, product4);

    // Create sample reviews
    const reviewId1 = randomUUID();
    const review1: Review = {
      id: reviewId1,
      orderId: randomUUID(), // This would be a real order ID
      reviewerId: buyerId1,
      reviewedId: sellerId1,
      rating: 5,
      comment: "Amazing dress! Quality is excellent and delivery was fast.",
      createdAt: new Date(),
    };
    this.reviews.set(reviewId1, review1);

    const reviewId2 = randomUUID();
    const review2: Review = {
      id: reviewId2,
      orderId: randomUUID(),
      reviewerId: buyerId1,
      reviewedId: sellerId2,
      rating: 4,
      comment: "Great jacket, exactly as described. Seller was very responsive.",
      createdAt: new Date(),
    };
    this.reviews.set(reviewId2, review2);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      phone: insertUser.phone ?? null,
      role: insertUser.role ?? 'buyer',
      createdAt: new Date(),
      isActive: insertUser.isActive ?? true,
      profileImage: insertUser.profileImage ?? null 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Product operations
  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductWithSeller(id: string): Promise<ProductWithSeller | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const seller = this.users.get(product.sellerId);
    if (!seller) return undefined;

    const reviews = Array.from(this.reviews.values()).filter(r => r.reviewedId === product.sellerId);
    const averageRating = reviews.length > 0 ? 
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    const reviewCount = reviews.length;

    return { 
      ...product, 
      seller, 
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount 
    };
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = {
      ...insertProduct,
      id,
      description: insertProduct.description ?? null,
      size: insertProduct.size ?? null,
      color: insertProduct.color ?? null,
      gender: insertProduct.gender ?? null,
      originalImage: insertProduct.originalImage ?? null,
      processedImage: insertProduct.processedImage ?? null,
      isActive: insertProduct.isActive ?? true,
      isApproved: false,
      views: 0,
      images: (insertProduct.images as string[]) || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const updatedProduct = { ...product, ...updates, updatedAt: new Date() };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  async getProductsBySeller(sellerId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.sellerId === sellerId);
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
    let products = Array.from(this.products.values())
      .filter(p => p.isActive && p.isApproved);

    // Apply filters
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      products = products.filter(p => 
        p.title.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.category.toLowerCase().includes(searchLower)
      );
    }

    if (query.category && query.category !== 'All Categories') {
      products = products.filter(p => p.category === query.category);
    }

    if (query.size && query.size !== 'Any Size') {
      products = products.filter(p => p.size === query.size);
    }

    if (query.color) {
      products = products.filter(p => p.color?.toLowerCase().includes(query.color!.toLowerCase()));
    }

    if (query.gender && query.gender !== 'all') {
      products = products.filter(p => p.gender === query.gender || p.gender === 'unisex');
    }

    if (query.minPrice !== undefined) {
      products = products.filter(p => parseFloat(p.price) >= query.minPrice!);
    }

    if (query.maxPrice !== undefined) {
      products = products.filter(p => parseFloat(p.price) <= query.maxPrice!);
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    products = products.slice(offset, offset + limit);

    // Convert to ProductWithSeller
    const productsWithSeller: ProductWithSeller[] = [];
    for (const product of products) {
      const seller = this.users.get(product.sellerId);
      if (seller) {
        const reviews = Array.from(this.reviews.values()).filter(r => r.reviewedId === product.sellerId);
        const averageRating = reviews.length > 0 ? 
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
        const reviewCount = reviews.length;

        productsWithSeller.push({ 
          ...product, 
          seller, 
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount 
        });
      }
    }

    return productsWithSeller;
  }

  async getFeaturedProducts(limit: number = 8): Promise<ProductWithSeller[]> {
    const products = Array.from(this.products.values())
      .filter(p => p.isActive && p.isApproved)
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, limit);

    const productsWithSeller: ProductWithSeller[] = [];
    for (const product of products) {
      const seller = this.users.get(product.sellerId);
      if (seller) {
        const reviews = Array.from(this.reviews.values()).filter(r => r.reviewedId === product.sellerId);
        const averageRating = reviews.length > 0 ? 
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
        const reviewCount = reviews.length;

        productsWithSeller.push({ 
          ...product, 
          seller, 
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount 
        });
      }
    }

    return productsWithSeller;
  }

  async getPendingProducts(): Promise<ProductWithSeller[]> {
    const products = Array.from(this.products.values())
      .filter(p => !p.isApproved && p.isActive);

    const productsWithSeller: ProductWithSeller[] = [];
    for (const product of products) {
      const seller = this.users.get(product.sellerId);
      if (seller) {
        productsWithSeller.push({ ...product, seller });
      }
    }

    return productsWithSeller;
  }

  async approveProduct(id: string): Promise<boolean> {
    const product = this.products.get(id);
    if (!product) return false;
    
    product.isApproved = true;
    this.products.set(id, product);
    return true;
  }

  async incrementProductViews(id: string): Promise<void> {
    const product = this.products.get(id);
    if (product) {
      product.views = (product.views ?? 0) + 1;
      this.products.set(id, product);
    }
  }

  // Order operations
  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrderWithDetails(id: string): Promise<OrderWithDetails | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const buyer = this.users.get(order.buyerId);
    const seller = this.users.get(order.sellerId);
    const product = this.products.get(order.productId);

    if (!buyer || !seller || !product) return undefined;

    return { ...order, buyer, seller, product };
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      ...insertOrder,
      id,
      quantity: insertOrder.quantity ?? 1,
      status: insertOrder.status ?? 'pending',
      deliveryFee: insertOrder.deliveryFee ?? '0',
      paymentMethod: insertOrder.paymentMethod ?? null,
      paymentReference: insertOrder.paymentReference ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder = { ...order, ...updates, updatedAt: new Date() };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async getOrdersByBuyer(buyerId: string): Promise<OrderWithDetails[]> {
    const orders = Array.from(this.orders.values()).filter(o => o.buyerId === buyerId);
    
    const ordersWithDetails: OrderWithDetails[] = [];
    for (const order of orders) {
      const buyer = this.users.get(order.buyerId);
      const seller = this.users.get(order.sellerId);
      const product = this.products.get(order.productId);

      if (buyer && seller && product) {
        ordersWithDetails.push({ ...order, buyer, seller, product });
      }
    }

    return ordersWithDetails.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getOrdersBySeller(sellerId: string): Promise<OrderWithDetails[]> {
    const orders = Array.from(this.orders.values()).filter(o => o.sellerId === sellerId);
    
    const ordersWithDetails: OrderWithDetails[] = [];
    for (const order of orders) {
      const buyer = this.users.get(order.buyerId);
      const seller = this.users.get(order.sellerId);
      const product = this.products.get(order.productId);

      if (buyer && seller && product) {
        ordersWithDetails.push({ ...order, buyer, seller, product });
      }
    }

    return ordersWithDetails.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getAllOrders(): Promise<OrderWithDetails[]> {
    const orders = Array.from(this.orders.values());
    
    const ordersWithDetails: OrderWithDetails[] = [];
    for (const order of orders) {
      const buyer = this.users.get(order.buyerId);
      const seller = this.users.get(order.sellerId);
      const product = this.products.get(order.productId);

      if (buyer && seller && product) {
        ordersWithDetails.push({ ...order, buyer, seller, product });
      }
    }

    return ordersWithDetails.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  // Message operations
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      productId: insertMessage.productId ?? null,
      isRead: insertMessage.isRead ?? false,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesBetweenUsers(user1Id: string, user2Id: string, productId?: string): Promise<Message[]> {
    const messages = Array.from(this.messages.values())
      .filter(m => 
        ((m.senderId === user1Id && m.receiverId === user2Id) ||
         (m.senderId === user2Id && m.receiverId === user1Id)) &&
        (!productId || m.productId === productId)
      )
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));

    return messages;
  }

  async markMessagesAsRead(userId: string, senderId: string, productId?: string): Promise<void> {
    Array.from(this.messages.values())
      .filter(m => 
        m.receiverId === userId && 
        m.senderId === senderId &&
        (!productId || m.productId === productId)
      )
      .forEach(m => {
        m.isRead = true;
        this.messages.set(m.id, m);
      });
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    return Array.from(this.messages.values())
      .filter(m => m.receiverId === userId && !m.isRead).length;
  }

  // Review operations
  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = randomUUID();
    const review: Review = {
      ...insertReview,
      id,
      comment: insertReview.comment ?? null,
      createdAt: new Date(),
    };
    this.reviews.set(id, review);
    return review;
  }

  async getReviewsBySeller(sellerId: string): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter(r => r.reviewedId === sellerId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getSellerAverageRating(sellerId: string): Promise<number> {
    const reviews = Array.from(this.reviews.values()).filter(r => r.reviewedId === sellerId);
    if (reviews.length === 0) return 0;
    
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  // Wishlist operations
  async addToWishlist(insertWishlist: InsertWishlist): Promise<Wishlist> {
    const id = randomUUID();
    const wishlist: Wishlist = {
      ...insertWishlist,
      id,
      createdAt: new Date(),
    };
    this.wishlist.set(id, wishlist);
    return wishlist;
  }

  async removeFromWishlist(userId: string, productId: string): Promise<boolean> {
    const wishlistItem = Array.from(this.wishlist.values())
      .find(w => w.userId === userId && w.productId === productId);
    
    if (!wishlistItem) return false;
    
    return this.wishlist.delete(wishlistItem.id);
  }

  async getUserWishlist(userId: string): Promise<ProductWithSeller[]> {
    const wishlistItems = Array.from(this.wishlist.values())
      .filter(w => w.userId === userId);
    
    const productsWithSeller: ProductWithSeller[] = [];
    for (const item of wishlistItems) {
      const product = this.products.get(item.productId);
      if (product) {
        const seller = this.users.get(product.sellerId);
        if (seller) {
          const reviews = Array.from(this.reviews.values()).filter(r => r.reviewedId === product.sellerId);
          const averageRating = reviews.length > 0 ? 
            reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
          const reviewCount = reviews.length;

          productsWithSeller.push({ 
            ...product, 
            seller, 
            averageRating: Math.round(averageRating * 10) / 10,
            reviewCount 
          });
        }
      }
    }

    return productsWithSeller;
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    return Array.from(this.wishlist.values())
      .some(w => w.userId === userId && w.productId === productId);
  }

  // Cart operations implementation
  async addToCart(insertCartItem: InsertCartItem): Promise<CartItem> {
    const existingItem = Array.from(this.cartItems.values())
      .find(item => item.userId === insertCartItem.userId && 
                   item.productId === insertCartItem.productId && 
                   item.size === insertCartItem.size);

    if (existingItem) {
      // Update existing item quantity with cumulative limit enforcement
      const newQuantity = existingItem.quantity + (insertCartItem.quantity || 1);
      existingItem.quantity = Math.min(10, newQuantity); // Enforce max 10 per item
      this.cartItems.set(existingItem.id, existingItem);
      return existingItem;
    } else {
      // Create new cart item with quantity validation
      const id = randomUUID();
      const cartItem: CartItem = {
        ...insertCartItem,
        id,
        size: insertCartItem.size ?? null,
        createdAt: new Date(),
        quantity: Math.max(1, Math.min(10, insertCartItem.quantity || 1))
      };
      this.cartItems.set(id, cartItem);
      return cartItem;
    }
  }

  async updateCartItem(userId: string, productId: string, size: string, updates: { quantity?: number }): Promise<CartItem | undefined> {
    const cartItem = Array.from(this.cartItems.values())
      .find(item => item.userId === userId && item.productId === productId && item.size === size);
    
    if (!cartItem) return undefined;
    
    if (updates.quantity !== undefined) {
      // Enforce quantity limits
      cartItem.quantity = Math.max(1, Math.min(10, updates.quantity));
    }
    
    this.cartItems.set(cartItem.id, cartItem);
    return cartItem;
  }

  async removeFromCart(userId: string, productId: string, size: string): Promise<boolean> {
    const cartItem = Array.from(this.cartItems.values())
      .find(item => item.userId === userId && 
                   item.productId === productId && 
                   item.size === size);
    
    if (!cartItem) return false;
    
    return this.cartItems.delete(cartItem.id);
  }

  async clearCart(userId: string): Promise<boolean> {
    const userCartItems = Array.from(this.cartItems.entries())
      .filter(([_, item]) => item.userId === userId);
    
    userCartItems.forEach(([id]) => this.cartItems.delete(id));
    return true;
  }

  async getCart(userId: string): Promise<CartItemWithProduct[]> {
    const userCartItems = Array.from(this.cartItems.values())
      .filter(item => item.userId === userId);
    
    const cartItemsWithProducts: CartItemWithProduct[] = [];
    for (const item of userCartItems) {
      const product = this.products.get(item.productId);
      if (product && product.isActive && product.isApproved) {
        const seller = this.users.get(product.sellerId);
        if (seller) {
          const reviews = Array.from(this.reviews.values()).filter(r => r.reviewedId === product.sellerId);
          const averageRating = reviews.length > 0 ? 
            reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
          const reviewCount = reviews.length;

          cartItemsWithProducts.push({
            ...item,
            product: {
              ...product,
              seller,
              averageRating: Math.round(averageRating * 10) / 10,
              reviewCount
            }
          });
        }
      }
    }

    return cartItemsWithProducts;
  }

  // Report operations
  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = randomUUID();
    const report: Report = {
      ...insertReport,
      id,
      status: insertReport.status ?? 'open',
      reportedUserId: insertReport.reportedUserId ?? null,
      reportedProductId: insertReport.reportedProductId ?? null,
      createdAt: new Date(),
    };
    this.reports.set(id, report);
    return report;
  }

  async getReports(status?: string): Promise<Report[]> {
    let reports = Array.from(this.reports.values());
    
    if (status) {
      reports = reports.filter(r => r.status === status);
    }
    
    return reports.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async updateReportStatus(id: string, status: string): Promise<boolean> {
    const report = this.reports.get(id);
    if (!report) return false;
    
    report.status = status;
    this.reports.set(id, report);
    return true;
  }
}

export class DatabaseStorage implements IStorage {
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
    const result = await db
      .select()
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.id, id));

    if (!result[0] || !result[0].users) return undefined;

    const product = result[0].products;
    const seller = result[0].users;

    // Get seller rating
    const ratingResult = await db
      .select({ avgRating: avg(reviews.rating), count: count(reviews.id) })
      .from(reviews)
      .where(eq(reviews.reviewedId, seller.id));

    const avgRating = ratingResult[0]?.avgRating || 0;
    const reviewCount = ratingResult[0]?.count || 0;

    return {
      ...product,
      seller,
      averageRating: Math.round(Number(avgRating) * 10) / 10,
      reviewCount: Number(reviewCount)
    };
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct as any).returning();
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ ...updates, updatedAt: sql`now()` })
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
    let productQuery = db
      .select()
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(and(eq(products.isActive, true), eq(products.isApproved, true)));

    // Apply filters
    const conditions = [eq(products.isActive, true), eq(products.isApproved, true)];

    if (query.search) {
      conditions.push(
        sql`(${products.title} ILIKE ${`%${query.search}%`} OR ${products.description} ILIKE ${`%${query.search}%`} OR ${products.category} ILIKE ${`%${query.search}%`})`
      );
    }

    if (query.category && query.category !== 'All Categories') {
      conditions.push(eq(products.category, query.category));
    }

    if (query.size && query.size !== 'Any Size') {
      conditions.push(eq(products.size, query.size));
    }

    if (query.color) {
      conditions.push(ilike(products.color, `%${query.color}%`));
    }

    if (query.gender && query.gender !== 'all') {
      conditions.push(
        sql`(${products.gender} = ${query.gender} OR ${products.gender} = 'unisex')`
      );
    }

    if (query.minPrice !== undefined) {
      conditions.push(gte(sql`CAST(${products.price} AS NUMERIC)`, query.minPrice));
    }

    if (query.maxPrice !== undefined) {
      conditions.push(lte(sql`CAST(${products.price} AS NUMERIC)`, query.maxPrice));
    }

    const result = await db
      .select()
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(and(...conditions))
      .limit(query.limit || 20)
      .offset(query.offset || 0);

    // Transform results to ProductWithSeller
    const productsWithSeller: ProductWithSeller[] = [];
    for (const row of result) {
      if (row.users && row.products) {
        const ratingResult = await db
          .select({ avgRating: avg(reviews.rating), count: count(reviews.id) })
          .from(reviews)
          .where(eq(reviews.reviewedId, row.users.id));

        const avgRating = ratingResult[0]?.avgRating || 0;
        const reviewCount = ratingResult[0]?.count || 0;

        productsWithSeller.push({
          ...row.products,
          seller: row.users,
          averageRating: Math.round(Number(avgRating) * 10) / 10,
          reviewCount: Number(reviewCount)
        });
      }
    }

    return productsWithSeller;
  }

  async getFeaturedProducts(limit: number = 8): Promise<ProductWithSeller[]> {
    const result = await db
      .select()
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(and(eq(products.isActive, true), eq(products.isApproved, true)))
      .orderBy(desc(products.views))
      .limit(limit);

    const productsWithSeller: ProductWithSeller[] = [];
    for (const row of result) {
      if (row.users && row.products) {
        const ratingResult = await db
          .select({ avgRating: avg(reviews.rating), count: count(reviews.id) })
          .from(reviews)
          .where(eq(reviews.reviewedId, row.users.id));

        const avgRating = ratingResult[0]?.avgRating || 0;
        const reviewCount = ratingResult[0]?.count || 0;

        productsWithSeller.push({
          ...row.products,
          seller: row.users,
          averageRating: Math.round(Number(avgRating) * 10) / 10,
          reviewCount: Number(reviewCount)
        });
      }
    }

    return productsWithSeller;
  }

  async getPendingProducts(): Promise<ProductWithSeller[]> {
    const result = await db
      .select()
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(and(eq(products.isApproved, false), eq(products.isActive, true)));

    const productsWithSeller: ProductWithSeller[] = [];
    for (const row of result) {
      if (row.users && row.products) {
        productsWithSeller.push({
          ...row.products,
          seller: row.users
        });
      }
    }

    return productsWithSeller;
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
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const buyer = await this.getUser(order.buyerId);
    const seller = await this.getUser(order.sellerId);
    const product = await this.getProduct(order.productId);

    if (!buyer || !seller || !product) return undefined;

    return { ...order, buyer, seller, product };
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async getOrdersByBuyer(buyerId: string): Promise<OrderWithDetails[]> {
    const orderList = await db.select().from(orders).where(eq(orders.buyerId, buyerId));
    
    const ordersWithDetails: OrderWithDetails[] = [];
    for (const order of orderList) {
      const buyer = await this.getUser(order.buyerId);
      const seller = await this.getUser(order.sellerId);
      const product = await this.getProduct(order.productId);

      if (buyer && seller && product) {
        ordersWithDetails.push({ ...order, buyer, seller, product });
      }
    }

    return ordersWithDetails.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getOrdersBySeller(sellerId: string): Promise<OrderWithDetails[]> {
    const orderList = await db.select().from(orders).where(eq(orders.sellerId, sellerId));
    
    const ordersWithDetails: OrderWithDetails[] = [];
    for (const order of orderList) {
      const buyer = await this.getUser(order.buyerId);
      const seller = await this.getUser(order.sellerId);
      const product = await this.getProduct(order.productId);

      if (buyer && seller && product) {
        ordersWithDetails.push({ ...order, buyer, seller, product });
      }
    }

    return ordersWithDetails.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getAllOrders(): Promise<OrderWithDetails[]> {
    const orderList = await db.select().from(orders);
    
    const ordersWithDetails: OrderWithDetails[] = [];
    for (const order of orderList) {
      const buyer = await this.getUser(order.buyerId);
      const seller = await this.getUser(order.sellerId);
      const product = await this.getProduct(order.productId);

      if (buyer && seller && product) {
        ordersWithDetails.push({ ...order, buyer, seller, product });
      }
    }

    return ordersWithDetails.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  // Message operations
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getMessagesBetweenUsers(user1Id: string, user2Id: string, productId?: string): Promise<Message[]> {
    const conditions = [
      sql`((${messages.senderId} = ${user1Id} AND ${messages.receiverId} = ${user2Id}) OR (${messages.senderId} = ${user2Id} AND ${messages.receiverId} = ${user1Id}))`
    ];

    if (productId) {
      conditions.push(eq(messages.productId, productId));
    }

    return db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(asc(messages.createdAt));
  }

  async markMessagesAsRead(userId: string, senderId: string, productId?: string): Promise<void> {
    const conditions = [eq(messages.receiverId, userId), eq(messages.senderId, senderId)];
    if (productId) {
      conditions.push(eq(messages.productId, productId));
    }
    
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(...conditions));
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count(messages.id) })
      .from(messages)
      .where(and(eq(messages.receiverId, userId), eq(messages.isRead, false)));
    
    return Number(result[0]?.count || 0);
  }

  // Review operations
  async createReview(insertReview: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(insertReview).returning();
    return review;
  }

  async getReviewsBySeller(sellerId: string): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.reviewedId, sellerId));
  }

  async getSellerAverageRating(sellerId: string): Promise<number> {
    const result = await db
      .select({ avgRating: avg(reviews.rating) })
      .from(reviews)
      .where(eq(reviews.reviewedId, sellerId));
    
    return Number(result[0]?.avgRating || 0);
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
    const wishlistItems = await db
      .select()
      .from(wishlist)
      .leftJoin(products, eq(wishlist.productId, products.id))
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(eq(wishlist.userId, userId));

    const productsWithSeller: ProductWithSeller[] = [];
    for (const row of wishlistItems) {
      if (row.users && row.products) {
        const ratingResult = await db
          .select({ avgRating: avg(reviews.rating), count: count(reviews.id) })
          .from(reviews)
          .where(eq(reviews.reviewedId, row.users.id));

        const avgRating = ratingResult[0]?.avgRating || 0;
        const reviewCount = ratingResult[0]?.count || 0;

        productsWithSeller.push({
          ...row.products,
          seller: row.users,
          averageRating: Math.round(Number(avgRating) * 10) / 10,
          reviewCount: Number(reviewCount)
        });
      }
    }

    return productsWithSeller;
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const [item] = await db
      .select()
      .from(wishlist)
      .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)));
    return !!item;
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
          eq(cartItems.size, insertCartItem.size || "")
        )
      );

    if (existingItem) {
      // Update existing item
      const newQuantity = Math.min(10, existingItem.quantity + (insertCartItem.quantity || 1));
      const [updated] = await db
        .update(cartItems)
        .set({ quantity: newQuantity })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return updated;
    } else {
      // Create new item
      const [cartItem] = await db.insert(cartItems).values({
        ...insertCartItem,
        quantity: Math.max(1, Math.min(10, insertCartItem.quantity || 1))
      }).returning();
      return cartItem;
    }
  }

  async updateCartItem(userId: string, productId: string, size: string, updates: { quantity?: number }): Promise<CartItem | undefined> {
    if (updates.quantity !== undefined) {
      const quantity = Math.max(1, Math.min(10, updates.quantity));
      const [cartItem] = await db
        .update(cartItems)
        .set({ quantity })
        .where(
          and(
            eq(cartItems.userId, userId),
            eq(cartItems.productId, productId),
            eq(cartItems.size, size)
          )
        )
        .returning();
      return cartItem || undefined;
    }
    return undefined;
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
    return (result.rowCount ?? 0) >= 0;
  }

  async getCart(userId: string): Promise<CartItemWithProduct[]> {
    const cartList = await db
      .select()
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .leftJoin(users, eq(products.sellerId, users.id))
      .where(eq(cartItems.userId, userId));

    const cartWithProducts: CartItemWithProduct[] = [];
    for (const row of cartList) {
      if (row.users && row.products && row.cart_items) {
        const ratingResult = await db
          .select({ avgRating: avg(reviews.rating), count: count(reviews.id) })
          .from(reviews)
          .where(eq(reviews.reviewedId, row.users.id));

        const avgRating = ratingResult[0]?.avgRating || 0;
        const reviewCount = ratingResult[0]?.count || 0;

        cartWithProducts.push({
          ...row.cart_items,
          product: {
            ...row.products,
            seller: row.users,
            averageRating: Math.round(Number(avgRating) * 10) / 10,
            reviewCount: Number(reviewCount)
          }
        });
      }
    }

    return cartWithProducts;
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
    const result = await db
      .update(reports)
      .set({ status })
      .where(eq(reports.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new MemStorage();
