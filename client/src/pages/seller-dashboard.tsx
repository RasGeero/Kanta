import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, Eye, DollarSign, Star, BarChart3, Upload, Clock, CheckCircle, Truck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { productApi, orderApi } from "@/services/api";
import { aiProcessing } from "@/services/ai-processing";
import { useToast } from "@/hooks/use-toast";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";

const productFormSchema = insertProductSchema.extend({
  image: z.instanceof(File).optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

export default function SellerDashboard() {
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isManageOrdersOpen, setIsManageOrdersOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock seller ID - in production, get from authentication
  const sellerId = "seller-id-placeholder";

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      sellerId,
      title: "",
      description: "",
      category: "",
      size: "",
      color: "",
      gender: "",
      condition: "",
      price: "",
      originalImage: "",
      processedImage: "",
    },
  });

  // Fetch seller products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/sellers', sellerId, 'products'],
    queryFn: () => productApi.getProductsBySeller(sellerId),
  });

  // Fetch seller orders
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['/api/sellers', sellerId, 'orders'],
    queryFn: () => orderApi.getOrdersBySeller(sellerId),
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'image' && value instanceof File) {
          formData.append('image', value);
        } else if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      return productApi.createProduct(formData);
    },
    onSuccess: () => {
      toast({
        title: "Product added successfully",
        description: "Your product has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sellers', sellerId, 'products'] });
      setIsAddProductOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setIsProcessingImage(true);
    try {
      const category = form.getValues('category');
      const gender = form.getValues('gender');

      const result = await aiProcessing.processProductImage(file, category || '', gender || '');

      form.setValue('originalImage', result.originalImageUrl);
      form.setValue('processedImage', result.processedImageUrl || result.originalImageUrl);

      toast({
        title: result.success ? "AI processing completed" : "Processing completed with warnings",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Image processing failed",
        description: "Using original image. You can try uploading again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingImage(false);
    }
  };

  const onSubmit = (data: ProductFormData) => {
    createProductMutation.mutate(data);
  };

  // Calculate stats
  const stats = {
    totalProducts: products.length,
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
    averageRating: products.length > 0 ? 
      products.reduce((sum, p) => sum + (p.averageRating || 0), 0) / products.length : 0,
  };

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return orderApi.updateOrder(orderId, { status });
    },
    onSuccess: () => {
      toast({
        title: "Order updated",
        description: "Order status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sellers', sellerId, 'orders'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Seller Dashboard</h1>
        <p className="text-muted-foreground">Manage your products and track your performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-primary/20 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold" data-testid="total-revenue">GH₵{stats.totalRevenue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-secondary/20 p-3 rounded-full">
                <Package className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orders</p>
                <p className="text-2xl font-bold" data-testid="total-orders">{stats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-accent/20 p-3 rounded-full">
                <Eye className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-2xl font-bold" data-testid="total-products">{stats.totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-primary/20 p-3 rounded-full">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold" data-testid="average-rating">{stats.averageRating.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <Plus className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Add New Product</h3>
                <p className="text-sm text-muted-foreground">Upload and list new items with AI processing</p>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product title" {...field} data-testid="product-title-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="category-select">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Dresses">Dresses</SelectItem>
                            <SelectItem value="Shirts">Shirts</SelectItem>
                            <SelectItem value="Pants">Pants</SelectItem>
                            <SelectItem value="Jackets">Jackets</SelectItem>
                            <SelectItem value="Shoes">Shoes</SelectItem>
                            <SelectItem value="Accessories">Accessories</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Size</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="size-select">
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="XS">XS</SelectItem>
                            <SelectItem value="S">S</SelectItem>
                            <SelectItem value="M">M</SelectItem>
                            <SelectItem value="L">L</SelectItem>
                            <SelectItem value="XL">XL</SelectItem>
                            <SelectItem value="XXL">XXL</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="condition-select">
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="excellent">Excellent</SelectItem>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="fair">Fair</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Red, Blue, Multi-color" {...field} value={field.value || ''} data-testid="color-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="gender-select">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="men">Men</SelectItem>
                            <SelectItem value="women">Women</SelectItem>
                            <SelectItem value="unisex">Unisex</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (GH₵)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            step="0.01"
                            {...field} 
                            data-testid="price-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your product..." 
                          rows={3}
                          {...field}
                          value={field.value || ''}
                          data-testid="description-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <Label>Product Image</Label>
                  <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Upload a photo of your product. Our AI will remove the background and add a professional mannequin.
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            form.setValue('image', file);
                            handleImageUpload(file);
                          }
                        }}
                        className="hidden"
                        id="image-upload"
                        data-testid="image-upload"
                      />
                      <label htmlFor="image-upload">
                        <Button type="button" variant="outline" asChild>
                          <span>Choose Image</span>
                        </Button>
                      </label>
                      {isProcessingImage && (
                        <p className="text-sm text-primary">Processing image with AI...</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddProductOpen(false)}
                    data-testid="cancel-button"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProductMutation.isPending || isProcessingImage}
                    data-testid="submit-product-button"
                  >
                    {createProductMutation.isPending ? "Adding..." : "Add Product"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isManageOrdersOpen} onOpenChange={setIsManageOrdersOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <Package className="h-12 w-12 text-secondary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Manage Orders</h3>
                <p className="text-sm text-muted-foreground">View and update order status</p>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Orders</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {isLoadingOrders ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="w-16 h-16 bg-muted rounded-lg animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No orders yet. Your orders will appear here once customers start buying!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <img 
                        src={order.product?.processedImage ?? order.product?.originalImage ?? undefined} 
                        alt={order.product?.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-card-foreground">{order.product?.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Order #{order.id.slice(-8)} • {order.quantity}x • GH₵{parseFloat(order.totalAmount).toFixed(0)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.buyerName} • {order.buyerPhone}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.deliveryAddress}, {order.deliveryCity}, {order.deliveryRegion}
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        <Badge variant={order.status === 'paid' ? 'default' : order.status === 'delivered' ? 'secondary' : 'outline'}>
                          {order.status}
                        </Badge>
                        <div>
                          <OrderStatusUpdateSelect orderId={order.id} currentStatus={order.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 text-accent mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">View Analytics</h3>
                <p className="text-sm text-muted-foreground">Detailed sales reports</p>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sales Analytics</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Analytics Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-xl font-bold">GH₵{stats.totalRevenue.toFixed(0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-secondary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Orders</p>
                        <p className="text-xl font-bold">{stats.totalOrders}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-accent" />
                      <div>
                        <p className="text-sm text-muted-foreground">Products</p>
                        <p className="text-xl font-bold">{stats.totalProducts}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Rating</p>
                        <p className="text-xl font-bold">{stats.averageRating.toFixed(1)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Analytics */}
              <Tabs defaultValue="orders" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="orders">Order Analytics</TabsTrigger>
                  <TabsTrigger value="products">Product Performance</TabsTrigger>
                  <TabsTrigger value="revenue">Revenue Breakdown</TabsTrigger>
                </TabsList>

                <TabsContent value="orders" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Status Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <OrderStatusBreakdown orders={orders} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="products" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Performing Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TopProductsList products={products} orders={orders} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="revenue" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RevenueByCategoryChart orders={orders} products={products} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recent Products */}
      <Card>
        <CardHeader>
          <CardTitle>Your Products</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingProducts ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-16 h-16 bg-muted rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No products yet. Add your first product to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {products.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <img 
                    src={product.processedImage ?? product.originalImage ?? undefined} 
                    alt={product.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-card-foreground">{product.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {product.category} • {product.size} • {product.condition}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="font-semibold text-primary">GH₵{parseFloat(product.price).toFixed(0)}</span>
                      <Badge variant={product.isApproved ? "default" : "secondary"}>
                        {product.isApproved ? "Approved" : "Pending Review"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{product.views} views</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for updating order status
function OrderStatusUpdateSelect({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateOrderStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return orderApi.updateOrder(orderId, { status });
    },
    onSuccess: () => {
      toast({
        title: "Order updated",
        description: "Order status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sellers'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (newStatus !== currentStatus) {
      updateOrderStatusMutation.mutate(newStatus);
    }
  };

  return (
    <Select value={currentStatus} onValueChange={handleStatusChange} disabled={updateOrderStatusMutation.isPending}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="paid">Paid</SelectItem>
        <SelectItem value="processing">Processing</SelectItem>
        <SelectItem value="shipped">Shipped</SelectItem>
        <SelectItem value="delivered">Delivered</SelectItem>
        <SelectItem value="cancelled">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  );
}

// Helper component for order status breakdown
function OrderStatusBreakdown({ orders }: { orders: any[] }) {
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusItems = [
    { status: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-500' },
    { status: 'paid', label: 'Paid', icon: CheckCircle, color: 'text-green-500' },
    { status: 'processing', label: 'Processing', icon: Package, color: 'text-blue-500' },
    { status: 'shipped', label: 'Shipped', icon: Truck, color: 'text-purple-500' },
    { status: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'text-green-600' },
    { status: 'cancelled', label: 'Cancelled', icon: Eye, color: 'text-red-500' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {statusItems.map(({ status, label, icon: Icon, color }) => {
        const count = statusCounts[status] || 0;
        return (
          <div key={status} className="flex items-center space-x-3 p-3 border rounded-lg">
            <Icon className={`h-5 w-5 ${color}`} />
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper component for top products list
function TopProductsList({ products, orders }: { products: any[]; orders: any[] }) {
  const productStats = products.map(product => {
    const productOrders = orders.filter(order => order.productId === product.id);
    const totalSold = productOrders.reduce((sum, order) => sum + order.quantity, 0);
    const totalRevenue = productOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

    return {
      ...product,
      totalSold,
      totalRevenue,
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);

  return (
    <div className="space-y-4">
      {productStats.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No sales data available yet.</p>
        </div>
      ) : (
        productStats.map((product, index) => (
          <div key={product.id} className="flex items-center space-x-4 p-4 border rounded-lg">
            <div className="flex-shrink-0">
              <Badge variant="outline">#{index + 1}</Badge>
            </div>
            <img 
              src={product.processedImage ?? product.originalImage ?? undefined} 
              alt={product.title}
              className="w-12 h-12 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h4 className="font-medium">{product.title}</h4>
              <p className="text-sm text-muted-foreground">
                {product.totalSold} sold • GH₵{product.totalRevenue.toFixed(0)} revenue
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-primary">GH₵{parseFloat(product.price).toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">{product.views} views</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Helper component for revenue by category chart
function RevenueByCategoryChart({ orders, products }: { orders: any[]; products: any[] }) {
  const categoryRevenue = orders.reduce((acc, order) => {
    const product = products.find(p => p.id === order.productId);
    if (product) {
      const category = product.category || 'Unknown';
      acc[category] = (acc[category] || 0) + parseFloat(order.totalAmount);
    }
    return acc;
  }, {} as Record<string, number>);

  const categoryEntries = Object.entries(categoryRevenue).sort(([,a], [,b]) => (b as number) - (a as number));
  const maxRevenue = Math.max(...(Object.values(categoryRevenue) as number[]));

  return (
    <div className="space-y-4">
      {categoryEntries.length === 0 ? (
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No revenue data available yet.</p>
        </div>
      ) : (
        categoryEntries.map(([category, revenue]) => {
          const revenueNum = revenue as number;
          const percentage = (revenueNum / maxRevenue) * 100;
          return (
            <div key={category} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{category}</span>
                <span className="text-primary font-semibold">GH₵{revenueNum.toFixed(0)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}