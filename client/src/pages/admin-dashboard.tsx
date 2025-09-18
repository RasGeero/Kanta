import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Store, Package, Flag, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { productApi, userApi, orderApi, reportApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import type { ProductWithSeller } from "@shared/schema";

export default function AdminDashboard() {
  const [selectedProduct, setSelectedProduct] = useState<ProductWithSeller | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
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

  const handleApproveProduct = (productId: string) => {
    approveProductMutation.mutate(productId);
  };

  const handleRejectProduct = (productId: string) => {
    deleteProductMutation.mutate(productId);
  };

  const handleUpdateReport = (reportId: string, status: string) => {
    updateReportMutation.mutate({ id: reportId, status });
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
                <p className="text-2xl font-bold" data-testid="monthly-revenue">₵{stats.monthlyRevenue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products" data-testid="tab-products">Product Reviews</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
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
    </div>
  );
}
