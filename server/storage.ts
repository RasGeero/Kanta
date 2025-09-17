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
  type InsertReport
} from "@shared/schema";
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
  markMessagesAsRead(userId: string, senderId: string): Promise<void>;
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

  async markMessagesAsRead(userId: string, senderId: string): Promise<void> {
    Array.from(this.messages.values())
      .filter(m => m.receiverId === userId && m.senderId === senderId)
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

export const storage = new MemStorage();
