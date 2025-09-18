import { apiRequest } from "@/lib/queryClient";
import type { 
  User, 
  InsertUser, 
  ProductWithSeller, 
  InsertProduct,
  OrderWithDetails,
  InsertOrder,
  Message,
  InsertMessage,
  Review,
  InsertReview,
  InsertWishlist,
  InsertReport,
  CartItem,
  InsertCartItem
} from "@shared/schema";

// Extended cart types
export type CartItemWithProduct = CartItem & {
  product: ProductWithSeller;
};

// User API
export const userApi = {
  register: async (userData: InsertUser): Promise<User> => {
    const response = await apiRequest('POST', '/api/auth/register', userData);
    return response.json();
  },

  login: async (email: string, password: string): Promise<User> => {
    const response = await apiRequest('POST', '/api/auth/login', { email, password });
    return response.json();
  },

  logout: async (): Promise<void> => {
    await apiRequest('POST', '/api/auth/logout');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiRequest('GET', '/api/auth/me');
    return response.json();
  },

  getUser: async (id: string): Promise<User> => {
    const response = await apiRequest('GET', `/api/users/${id}`);
    return response.json();
  },

  updateUser: async (id: string, userData: { firstName?: string; lastName?: string; email?: string; phone?: string }): Promise<User> => {
    const response = await apiRequest('PUT', `/api/users/${id}`, userData);
    return response.json();
  },

  changePassword: async (id: string, currentPassword: string, newPassword: string): Promise<void> => {
    await apiRequest('PUT', `/api/users/${id}/password`, {
      currentPassword,
      newPassword,
    });
  },

  downloadUserData: async (id: string): Promise<any> => {
    const response = await apiRequest('GET', `/api/users/${id}/data`);
    return response.json();
  },

  deleteAccount: async (id: string): Promise<void> => {
    await apiRequest('DELETE', `/api/users/${id}`);
  },

  getAllUsers: async (): Promise<User[]> => {
    const response = await apiRequest('GET', '/api/users');
    return response.json();
  },
};

// Product API
export const productApi = {
  searchProducts: async (params: {
    search?: string;
    category?: string;
    size?: string;
    color?: string;
    gender?: string;
    maxPrice?: number;
    minPrice?: number;
    limit?: number;
    offset?: number;
  }): Promise<ProductWithSeller[]> => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    const response = await apiRequest('GET', `/api/products/search?${queryParams}`);
    return response.json();
  },

  getFeaturedProducts: async (limit: number = 8): Promise<ProductWithSeller[]> => {
    const response = await apiRequest('GET', `/api/products/featured?limit=${limit}`);
    return response.json();
  },

  getPendingProducts: async (): Promise<ProductWithSeller[]> => {
    const response = await apiRequest('GET', '/api/products/pending');
    return response.json();
  },

  getProduct: async (id: string): Promise<ProductWithSeller> => {
    const response = await apiRequest('GET', `/api/products/${id}`);
    return response.json();
  },

  createProduct: async (productData: FormData): Promise<ProductWithSeller> => {
    const response = await fetch('/api/products', {
      method: 'POST',
      body: productData,
    });
    if (!response.ok) {
      throw new Error('Failed to create product');
    }
    return response.json();
  },

  updateProduct: async (id: string, updates: Partial<InsertProduct>): Promise<ProductWithSeller> => {
    const response = await apiRequest('PUT', `/api/products/${id}`, updates);
    return response.json();
  },

  deleteProduct: async (id: string): Promise<void> => {
    await apiRequest('DELETE', `/api/products/${id}`);
  },

  approveProduct: async (id: string): Promise<void> => {
    await apiRequest('POST', `/api/products/${id}/approve`);
  },

  getProductsBySeller: async (sellerId: string): Promise<ProductWithSeller[]> => {
    const response = await apiRequest('GET', `/api/sellers/${sellerId}/products`);
    return response.json();
  },
};

// Order API
export const orderApi = {
  createOrder: async (orderData: InsertOrder): Promise<OrderWithDetails> => {
    const response = await apiRequest('POST', '/api/orders', orderData);
    return response.json();
  },

  getOrder: async (id: string): Promise<OrderWithDetails> => {
    const response = await apiRequest('GET', `/api/orders/${id}`);
    return response.json();
  },

  updateOrder: async (id: string, updates: Partial<InsertOrder>): Promise<OrderWithDetails> => {
    const response = await apiRequest('PUT', `/api/orders/${id}`, updates);
    return response.json();
  },

  getOrdersByBuyer: async (buyerId: string): Promise<OrderWithDetails[]> => {
    const response = await apiRequest('GET', `/api/buyers/${buyerId}/orders`);
    return response.json();
  },

  getOrdersBySeller: async (sellerId: string): Promise<OrderWithDetails[]> => {
    const response = await apiRequest('GET', `/api/sellers/${sellerId}/orders`);
    return response.json();
  },

  getAllOrders: async (): Promise<OrderWithDetails[]> => {
    const response = await apiRequest('GET', '/api/orders');
    return response.json();
  },
};

// Message API
export const messageApi = {
  sendMessage: async (messageData: Omit<InsertMessage, 'senderId'>): Promise<Message> => {
    const response = await apiRequest('POST', '/api/messages', messageData);
    return response.json();
  },

  getMessages: async (user1Id: string, user2Id: string, productId?: string): Promise<Message[]> => {
    const url = productId 
      ? `/api/messages/${user1Id}/${user2Id}?productId=${productId}`
      : `/api/messages/${user1Id}/${user2Id}`;
    const response = await apiRequest('GET', url);
    return response.json();
  },

  markAsRead: async (userId: string, senderId: string, productId?: string): Promise<void> => {
    const url = productId 
      ? `/api/messages/mark-read/${userId}/${senderId}?productId=${productId}`
      : `/api/messages/mark-read/${userId}/${senderId}`;
    await apiRequest('PUT', url);
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    const response = await apiRequest('GET', `/api/users/${userId}/unread-messages`);
    const data = await response.json();
    return data.count;
  },
};

// Review API
export const reviewApi = {
  createReview: async (reviewData: InsertReview): Promise<Review> => {
    const response = await apiRequest('POST', '/api/reviews', reviewData);
    return response.json();
  },

  getSellerReviews: async (sellerId: string): Promise<Review[]> => {
    const response = await apiRequest('GET', `/api/sellers/${sellerId}/reviews`);
    return response.json();
  },

  getSellerRating: async (sellerId: string): Promise<number> => {
    const response = await apiRequest('GET', `/api/sellers/${sellerId}/rating`);
    const data = await response.json();
    return data.rating;
  },
};

// Wishlist API
export const wishlistApi = {
  addToWishlist: async (productId: string): Promise<void> => {
    await apiRequest('POST', '/api/wishlist', { productId });
  },

  removeFromWishlist: async (productId: string): Promise<void> => {
    await apiRequest('DELETE', `/api/wishlist/${productId}`);
  },

  getUserWishlist: async (): Promise<ProductWithSeller[]> => {
    const response = await apiRequest('GET', '/api/wishlist');
    return response.json();
  },

  isInWishlist: async (productId: string): Promise<boolean> => {
    const response = await apiRequest('GET', `/api/wishlist/${productId}/exists`);
    const data = await response.json();
    return data.exists;
  },
};

// Cart API (for localStorage-to-backend transition)
export const cartApi = {
  addToCart: async (productId: string, quantity: number = 1, size?: string): Promise<void> => {
    await apiRequest('POST', '/api/cart', { productId, quantity, size });
  },

  removeFromCart: async (productId: string, size?: string): Promise<void> => {
    const query = size ? `?size=${encodeURIComponent(size)}` : '';
    await apiRequest('DELETE', `/api/cart/${productId}${query}`);
  },

  updateCartQuantity: async (productId: string, quantity: number, size?: string): Promise<void> => {
    await apiRequest('PUT', `/api/cart/${productId}`, { quantity, size });
  },

  getUserCart: async (): Promise<CartItemWithProduct[]> => {
    const response = await apiRequest('GET', '/api/cart');
    return response.json();
  },

  clearCart: async (): Promise<void> => {
    await apiRequest('DELETE', '/api/cart');
  },
};

// Report API
export const reportApi = {
  createReport: async (reportData: InsertReport): Promise<void> => {
    await apiRequest('POST', '/api/reports', reportData);
  },

  getReports: async (status?: string): Promise<any[]> => {
    const url = status ? `/api/reports?status=${status}` : '/api/reports';
    const response = await apiRequest('GET', url);
    return response.json();
  },

  updateReportStatus: async (id: string, status: string): Promise<void> => {
    await apiRequest('PUT', `/api/reports/${id}/status`, { status });
  },
};
