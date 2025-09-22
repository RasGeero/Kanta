import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Store, Package, Flag, DollarSign, CheckCircle, XCircle, User, Plus, Edit, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productApi, userApi, orderApi, reportApi, fashionModelApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { insertFashionModelSchema } from "@shared/schema";
import { z } from "zod";
import type { ProductWithSeller, FashionModel } from "@shared/schema";

// Form schema for mannequin creation/editing
const mannequinFormSchema = insertFashionModelSchema.extend({
  tagsString: z.string().optional(),
  height: z.coerce.number().int().positive().optional(),
  sortOrder: z.coerce.number().int().optional()
}).omit({ tags: true, imageUrl: true, cloudinaryPublicId: true });

type MannequinFormData = z.infer<typeof mannequinFormSchema>;

export default function AdminDashboard() {
  const [selectedProduct, setSelectedProduct] = useState<ProductWithSeller | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMannequinModalOpen, setIsMannequinModalOpen] = useState(false);
  const [selectedMannequin, setSelectedMannequin] = useState<FashionModel | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch admin data
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => userApi.getAllUsers(),
  });

  const { data: pendingProducts = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ['/api/products/pending'],
    queryFn: () => productApi.getPendingProducts(),
  });

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: () => orderApi.getAllOrders(),
  });

  const { data: reports = [], isLoading: isLoadingReports } = useQuery({
    queryKey: ['/api/reports'],
    queryFn: () => reportApi.getReports(),
  });

  const { data: mannequins = [], isLoading: isLoadingMannequins } = useQuery({
    queryKey: ['/api/fashion-models'],
    queryFn: () => fashionModelApi.getAllFashionModels(),
  });

  // Mannequin form
  const mannequinForm = useForm<MannequinFormData>({
    resolver: zodResolver(mannequinFormSchema),
    defaultValues: {
      name: '',
      gender: 'unisex',
      bodyType: 'average',
      ethnicity: 'diverse',
      ageRange: 'adult',
      pose: 'front',
      category: 'general',
      height: undefined,
      hasTransparentBackground: true,
      isActive: true,
      sortOrder: 0,
      tagsString: '',
    },
  });

  // Approve product mutation
  const approveProductMutation = useMutation({
    mutationFn: (productId: string) => productApi.approveProduct(productId),
    onSuccess: () => {
      toast({
        title: "Product approved",
        description: "Product has been approved and is now live.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products/pending'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve product.",
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => productApi.deleteProduct(productId),
    onSuccess: () => {
      toast({
        title: "Product rejected",
        description: "Product has been rejected and removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products/pending'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject product.",
        variant: "destructive",
      });
    },
  });

  // Update report status mutation
  const updateReportMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      reportApi.updateReportStatus(id, status),
    onSuccess: () => {
      toast({
        title: "Report updated",
        description: "Report status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update report status.",
        variant: "destructive",
      });
    },
  });

  // Toggle mannequin status mutation
  const toggleMannequinMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      fashionModelApi.toggleFashionModelStatus(id, isActive),
    onSuccess: () => {
      toast({
        title: "Mannequin updated",
        description: "Mannequin status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/fashion-models'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update mannequin status.",
        variant: "destructive",
      });
    },
  });

  // Delete mannequin mutation
  const deleteMannequinMutation = useMutation({
    mutationFn: (id: string) => fashionModelApi.deleteFashionModel(id),
    onSuccess: () => {
      toast({
        title: "Mannequin deleted",
        description: "Mannequin has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/fashion-models'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete mannequin.",
        variant: "destructive",
      });
    },
  });

  // Create mannequin mutation
  const createMannequinMutation = useMutation({
    mutationFn: (data: FormData) => fashionModelApi.createFashionModel(data),
    onSuccess: () => {
      toast({
        title: "Mannequin created",
        description: "Mannequin has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/fashion-models'] });
      setIsMannequinModalOpen(false);
      mannequinForm.reset();
      setImageFile(null);
      setImagePreview(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create mannequin.",
        variant: "destructive",
      });
    },
  });

  // Update mannequin mutation
  const updateMannequinMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: FormData }) => 
      fashionModelApi.updateFashionModel(id, data),
    onSuccess: () => {
      toast({
        title: "Mannequin updated",
        description: "Mannequin has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/fashion-models'] });
      setIsMannequinModalOpen(false);
      setSelectedMannequin(null);
      mannequinForm.reset();
      setImageFile(null);
      setImagePreview(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update mannequin.",
        variant: "destructive",
      });
    },
  });

  const handleApproveProduct = (productId: string) => {
    approveProductMutation.mutate(productId);
  };

  const handleRejectProduct = (productId: string) => {
    deleteProductMutation.mutate(productId);
  };

  const handleUpdateReport = (reportId: string, status: string) => {
    updateReportMutation.mutate({ id: reportId, status });
  };

  const handleToggleMannequin = (mannequinId: string, isActive: boolean) => {
    toggleMannequinMutation.mutate({ id: mannequinId, isActive });
  };

  const handleDeleteMannequin = (mannequinId: string) => {
    deleteMannequinMutation.mutate(mannequinId);
  };

  const handleCreateMannequin = () => {
    setSelectedMannequin(null);
    mannequinForm.reset();
    setImageFile(null);
    setImagePreview(null);
    setIsMannequinModalOpen(true);
  };

  const handleEditMannequin = (mannequin: FashionModel) => {
    setSelectedMannequin(mannequin);
    mannequinForm.reset({
      name: mannequin.name,
      gender: mannequin.gender,
      bodyType: mannequin.bodyType || 'average',
      ethnicity: mannequin.ethnicity || 'diverse',
      ageRange: mannequin.ageRange || 'adult',
      pose: mannequin.pose || 'front',
      category: mannequin.category || 'general',
      height: mannequin.height || undefined,
      hasTransparentBackground: mannequin.hasTransparentBackground ?? true,
      isActive: mannequin.isActive ?? true,
      sortOrder: mannequin.sortOrder || 0,
      tagsString: mannequin.tags?.join(', ') || '',
    });
    setImagePreview(mannequin.imageUrl);
    setImageFile(null);
    setIsMannequinModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmitMannequin = (data: MannequinFormData) => {
    const formData = new FormData();
    
    // Add all form fields
    formData.append('name', data.name);
    formData.append('gender', data.gender);
    formData.append('bodyType', data.bodyType || 'average');
    formData.append('ethnicity', data.ethnicity || 'diverse');
    formData.append('ageRange', data.ageRange || 'adult');
    formData.append('pose', data.pose || 'front');
    formData.append('category', data.category || 'general');
    if (data.height) formData.append('height', data.height.toString());
    formData.append('hasTransparentBackground', (data.hasTransparentBackground ?? true).toString());
    formData.append('isActive', (data.isActive ?? true).toString());
    formData.append('sortOrder', (data.sortOrder || 0).toString());
    
    // Handle tags
    const tagsArray = data.tagsString 
      ? data.tagsString.split(',').map((tag: string) => tag.trim()).filter(Boolean)
      : [];
    formData.append('tags', JSON.stringify(tagsArray));
    
    // Add image file if provided
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    if (selectedMannequin) {
      updateMannequinMutation.mutate({ id: selectedMannequin.id, data: formData });
    } else {
      createMannequinMutation.mutate(formData);
    }
  };

  const handleProductClick = (product: ProductWithSeller) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  // Calculate stats
  const stats = {
    totalUsers: users.length,
    activeSellers: users.filter(u => u.role === 'seller').length,
    totalListings: pendingProducts.length, // In real app, this would be all products
    pendingReports: reports.filter(r => r.status === 'open').length,
    monthlyRevenue: orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="gradient-bg p-6 rounded-lg text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Kantamanto Admin Panel</h1>
              <p className="opacity-90">Marketplace overview and management</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Store className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-primary/20 p-3 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold" data-testid="total-users">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-secondary/20 p-3 rounded-full">
                <Store className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Sellers</p>
                <p className="text-2xl font-bold" data-testid="active-sellers">{stats.activeSellers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-accent/20 p-3 rounded-full">
                <Package className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Listings</p>
                <p className="text-2xl font-bold" data-testid="total-listings">{stats.totalListings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-destructive/20 p-3 rounded-full">
                <Flag className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Reports</p>
                <p className="text-2xl font-bold" data-testid="pending-reports">{stats.pendingReports}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-accent/20 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold" data-testid="monthly-revenue">GH₵{stats.monthlyRevenue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="products" data-testid="tab-products">Product Reviews</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
          <TabsTrigger value="mannequins" data-testid="tab-mannequins">Mannequins</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Products Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPending ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                      <div className="w-16 h-16 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingProducts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No products pending review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingProducts.map((product) => (
                    <div key={product.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <img 
                        src={product.processedImage ?? product.originalImage ?? undefined} 
                        alt={product.title}
                        className="w-16 h-16 object-cover rounded-lg cursor-pointer"
                        onClick={() => handleProductClick(product)}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-card-foreground">{product.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          by {product.seller.firstName} {product.seller.lastName}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="font-semibold text-primary">₵{parseFloat(product.price).toFixed(0)}</span>
                          <Badge variant="secondary">{product.category}</Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm"
                          onClick={() => handleApproveProduct(product.id)}
                          disabled={approveProductMutation.isPending}
                          data-testid={`approve-product-${product.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleRejectProduct(product.id)}
                          disabled={deleteProductMutation.isPending}
                          data-testid={`reject-product-${product.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                      <div className="w-12 h-12 bg-muted rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {users.slice(0, 10).map((user) => (
                    <div key={user.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground font-bold">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-card-foreground">
                          {user.firstName} {user.lastName}
                        </h4>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={user.role === 'admin' ? 'default' : user.role === 'seller' ? 'secondary' : 'outline'}>
                          {user.role}
                        </Badge>
                        <Badge variant={user.isActive ? 'default' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingOrders ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                      <div className="w-16 h-16 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No orders yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.slice(0, 10).map((order) => (
                    <div key={order.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <img 
                        src={order.product.processedImage ?? order.product.originalImage ?? undefined} 
                        alt={order.product.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-card-foreground">{order.product.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Order by {order.buyer.firstName} {order.buyer.lastName}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="font-semibold text-primary">₵{parseFloat(order.totalAmount).toFixed(0)}</span>
                          <Badge variant={
                            order.status === 'delivered' ? 'default' :
                            order.status === 'shipped' ? 'secondary' :
                            order.status === 'paid' ? 'outline' : 'destructive'
                          }>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>User Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg animate-pulse">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No reports to review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.slice(0, 10).map((report) => (
                    <div key={report.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-card-foreground">{report.type}</h4>
                        <Badge variant={
                          report.status === 'resolved' ? 'default' :
                          report.status === 'in_progress' ? 'secondary' : 'destructive'
                        }>
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                        {report.status === 'open' && (
                          <div className="space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUpdateReport(report.id, 'in_progress')}
                              data-testid={`review-report-${report.id}`}
                            >
                              Review
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleUpdateReport(report.id, 'resolved')}
                              data-testid={`resolve-report-${report.id}`}
                            >
                              Resolve
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mannequins">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Mannequin Management</CardTitle>
                <Button 
                  onClick={handleCreateMannequin}
                  data-testid="create-mannequin"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Mannequin
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingMannequins ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                      <div className="w-16 h-16 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : mannequins.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No mannequins available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mannequins.map((mannequin) => (
                    <div key={mannequin.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <img 
                        src={mannequin.imageUrl} 
                        alt={mannequin.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-card-foreground">{mannequin.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {mannequin.gender} • {mannequin.bodyType} • {mannequin.ethnicity}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={mannequin.category === 'formal' ? 'default' : 'secondary'}>
                            {mannequin.category}
                          </Badge>
                          <Badge variant={mannequin.isActive ? 'default' : 'destructive'}>
                            {mannequin.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {mannequin.tags && mannequin.tags.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {mannequin.tags.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditMannequin(mannequin)}
                          data-testid={`edit-mannequin-${mannequin.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm"
                          variant={mannequin.isActive ? "outline" : "default"}
                          onClick={() => handleToggleMannequin(mannequin.id, !mannequin.isActive)}
                          disabled={toggleMannequinMutation.isPending}
                          data-testid={`toggle-mannequin-${mannequin.id}`}
                        >
                          {mannequin.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteMannequin(mannequin.id)}
                          disabled={deleteMannequinMutation.isPending}
                          data-testid={`delete-mannequin-${mannequin.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Details Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Review</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <img 
                src={selectedProduct.processedImage ?? selectedProduct.originalImage ?? undefined} 
                alt={selectedProduct.title}
                className="w-full h-64 object-cover rounded-lg"
              />
              <div>
                <h3 className="text-xl font-semibold">{selectedProduct.title}</h3>
                <p className="text-muted-foreground">by {selectedProduct.seller.firstName} {selectedProduct.seller.lastName}</p>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-primary">₵{parseFloat(selectedProduct.price).toFixed(0)}</span>
                </div>
              </div>
              {selectedProduct.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{selectedProduct.description}</p>
                </div>
              )}
              <div className="flex justify-end space-x-4">
                <Button 
                  variant="destructive"
                  onClick={() => {
                    handleRejectProduct(selectedProduct.id);
                    setIsProductModalOpen(false);
                  }}
                  data-testid={`modal-reject-${selectedProduct.id}`}
                >
                  Reject Product
                </Button>
                <Button 
                  onClick={() => {
                    handleApproveProduct(selectedProduct.id);
                    setIsProductModalOpen(false);
                  }}
                  data-testid={`modal-approve-${selectedProduct.id}`}
                >
                  Approve Product
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mannequin Form Modal */}
      <Dialog open={isMannequinModalOpen} onOpenChange={setIsMannequinModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMannequin ? 'Edit Mannequin' : 'Create New Mannequin'}
            </DialogTitle>
          </DialogHeader>
          <Form {...mannequinForm}>
            <form onSubmit={mannequinForm.handleSubmit(onSubmitMannequin)} className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Mannequin Image</label>
                <div className="flex flex-col space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    data-testid="mannequin-image-input"
                  />
                  {imagePreview && (
                    <div className="w-32 h-48 border rounded-lg overflow-hidden">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Name */}
              <FormField
                control={mannequinForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Athletic Male Model" {...field} data-testid="mannequin-name-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Gender */}
              <FormField
                control={mannequinForm.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="mannequin-gender-select">
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

              {/* Body Type */}
              <FormField
                control={mannequinForm.control}
                name="bodyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="mannequin-body-type-select">
                          <SelectValue placeholder="Select body type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="slim">Slim</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="athletic">Athletic</SelectItem>
                        <SelectItem value="plus_size">Plus Size</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Ethnicity */}
              <FormField
                control={mannequinForm.control}
                name="ethnicity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ethnicity</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="mannequin-ethnicity-select">
                          <SelectValue placeholder="Select ethnicity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="caucasian">Caucasian</SelectItem>
                        <SelectItem value="african">African</SelectItem>
                        <SelectItem value="asian">Asian</SelectItem>
                        <SelectItem value="hispanic">Hispanic</SelectItem>
                        <SelectItem value="middle_eastern">Middle Eastern</SelectItem>
                        <SelectItem value="diverse">Diverse</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Age Range */}
              <FormField
                control={mannequinForm.control}
                name="ageRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age Range</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="mannequin-age-range-select">
                          <SelectValue placeholder="Select age range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="young_adult">Young Adult</SelectItem>
                        <SelectItem value="adult">Adult</SelectItem>
                        <SelectItem value="mature">Mature</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Pose */}
              <FormField
                control={mannequinForm.control}
                name="pose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pose</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="mannequin-pose-select">
                          <SelectValue placeholder="Select pose" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="front">Front</SelectItem>
                        <SelectItem value="side">Side</SelectItem>
                        <SelectItem value="three_quarter">Three Quarter</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={mannequinForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="mannequin-category-select">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="athletic">Athletic</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Height */}
                <FormField
                  control={mannequinForm.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g., 175" 
                          {...field}
                          data-testid="mannequin-height-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sort Order */}
                <FormField
                  control={mannequinForm.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          data-testid="mannequin-sort-order-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tags */}
              <FormField
                control={mannequinForm.control}
                name="tagsString"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (comma-separated)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., professional, studio, full-body" 
                        {...field}
                        data-testid="mannequin-tags-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Transparent Background */}
                <FormField
                  control={mannequinForm.control}
                  name="hasTransparentBackground"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                          data-testid="mannequin-transparent-bg-checkbox"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        Has Transparent Background
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {/* Active Status */}
                <FormField
                  control={mannequinForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                          data-testid="mannequin-active-checkbox"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        Active
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMannequinModalOpen(false)}
                  data-testid="mannequin-form-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMannequinMutation.isPending || updateMannequinMutation.isPending}
                  data-testid="mannequin-form-submit"
                >
                  {createMannequinMutation.isPending || updateMannequinMutation.isPending
                    ? 'Saving...'
                    : selectedMannequin ? 'Update Mannequin' : 'Create Mannequin'
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
