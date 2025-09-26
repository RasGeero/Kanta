import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User, Package, Heart, MessageCircle, Settings, Edit, LogOut, Shield, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { orderApi, wishlistApi, messageApi, userApi } from "@/services/api";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import type { OrderWithDetails, ProductWithSeller } from "@shared/schema";

const profileFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional(),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileFormSchema>;
type PasswordFormData = z.infer<typeof passwordFormSchema>;

export default function Profile() {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();

  // Handle tab query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['orders', 'wishlist', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Please log in to view your profile.</p>
      </div>
    );
  }

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Fetch user orders
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['/api/buyers', user.id, 'orders'],
    queryFn: () => orderApi.getOrdersByBuyer(user.id),
  });

  // Fetch user wishlist
  const { data: wishlist = [], isLoading: isLoadingWishlist } = useQuery({
    queryKey: ['/api/wishlist'],
    queryFn: () => wishlistApi.getUserWishlist(),
  });

  // Fetch unread messages count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['/api/users', user.id, 'unread-messages'],
    queryFn: () => messageApi.getUnreadCount(user.id),
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => userApi.updateUser(user.id, data),
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', user.id] });
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to update profile. Please try again.';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Remove from wishlist mutation
  const removeFromWishlistMutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.removeFromWishlist(productId),
    onSuccess: () => {
      toast({
        title: "Removed from wishlist",
        description: "Item has been removed from your wishlist.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item from wishlist.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormData) => 
      userApi.changePassword(user.id, data.currentPassword, data.newPassword),
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      setIsChangingPassword(false);
      passwordForm.reset();
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to change password. Please try again.';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Download user data mutation
  const downloadDataMutation = useMutation({
    mutationFn: () => userApi.downloadUserData(user.id),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kantamanto-user-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Data downloaded",
        description: "Your account data has been downloaded successfully.",
      });
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to download data. Please try again.';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: () => userApi.deleteAccount(user.id),
    onSuccess: () => {
      toast({
        title: "Account deactivated",
        description: "Your account has been deactivated successfully.",
      });
      logout();
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to delete account. Please try again.';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRemoveFromWishlist = (productId: string) => {
    removeFromWishlistMutation.mutate(productId);
  };

  const handleViewOrderDetails = (order: any) => {
    // For now, show order details in a toast
    // In a full implementation, this would open a modal with detailed order information
    toast({
      title: `Order #${order.id.slice(0, 8)}`,
      description: `${order.product.title} - ${order.status} - ₵${parseFloat(order.totalAmount).toFixed(0)}`,
    });
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  const handleDownloadData = () => {
    downloadDataMutation.mutate();
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      deleteAccountMutation.mutate();
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Settings button handlers
  const handleEmailNotifications = () => {
    toast({
      title: "Email Notifications",
      description: "Email notification settings will be available soon. For now, all important updates will be sent to your registered email.",
    });
  };

  const handleSmsNotifications = () => {
    toast({
      title: "SMS Notifications",
      description: "SMS notification setup will be available soon. You'll receive delivery updates via email for now.",
    });
  };

  const handlePrivacySettings = () => {
    toast({
      title: "Privacy Settings",
      description: "Privacy settings management will be available soon. Your data is always protected according to our privacy policy.",
    });
  };

  const handleEditStore = () => {
    toast({
      title: "Store Information",
      description: "Store customization features will be available soon. You can manage basic info through your profile for now.",
    });
  };

  const handleShippingSettings = () => {
    toast({
      title: "Shipping Settings",
      description: "Shipping configuration will be available soon. Standard delivery options are currently available for all orders.",
    });
  };

  const handleReturnPolicy = () => {
    toast({
      title: "Return Policy",
      description: "Return policy management will be available soon. Standard return terms apply to all sales.",
    });
  };

  const handleOrderNotifications = () => {
    toast({
      title: "Order Notifications",
      description: "Order notification preferences will be available soon. You'll receive all important order updates via email.",
    });
  };

  const handlePerformanceReports = () => {
    toast({
      title: "Performance Reports",
      description: "Automated performance reports will be available soon. You can view your sales data in the seller dashboard.",
    });
  };

  const handleInventoryAlerts = () => {
    toast({
      title: "Inventory Alerts",
      description: "Inventory management features will be available soon. Monitor your listings through the seller dashboard.",
    });
  };

  const handlePaymentMethods = () => {
    toast({
      title: "Payment Methods",
      description: "Payment method management will be available soon. Payments are currently processed through our secure platform.",
    });
  };

  const handleTaxInformation = () => {
    toast({
      title: "Tax Information",
      description: "Tax settings will be available soon. Please consult with a tax professional for current obligations.",
    });
  };

  const handleCommissionSettings = () => {
    toast({
      title: "Commission Settings",
      description: "Platform commission is currently 5% of each sale. Detailed commission structure will be available soon.",
    });
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'default';
      case 'shipped':
        return 'secondary';
      case 'paid':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-xl font-bold">
                {form.getValues('firstName').charAt(0)}{form.getValues('lastName').charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold" data-testid="user-name">
                {form.getValues('firstName')} {form.getValues('lastName')}
              </h1>
              <p className="text-muted-foreground" data-testid="user-email">
                {form.getValues('email')}
              </p>
            </div>
          </div>
          
          <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="edit-profile-button">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="first-name-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="last-name-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="email-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="phone-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsEditingProfile(false)}
                      data-testid="cancel-edit-button"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      data-testid="save-profile-button"
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-primary/20 p-2 rounded-full">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orders</p>
                <p className="text-xl font-bold" data-testid="total-orders">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-destructive/20 p-2 rounded-full">
                <Heart className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wishlist</p>
                <p className="text-xl font-bold" data-testid="wishlist-count">{wishlist.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-accent/20 p-2 rounded-full">
                <MessageCircle className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Messages</p>
                <p className="text-xl font-bold" data-testid="unread-messages">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-secondary/20 p-2 rounded-full">
                <Settings className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Account</p>
                <p className="text-sm font-medium">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders" data-testid="orders-tab">Orders</TabsTrigger>
          <TabsTrigger value="wishlist" data-testid="wishlist-tab">Wishlist</TabsTrigger>
          <TabsTrigger value="settings" data-testid="settings-tab">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingOrders ? (
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
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No orders yet. Start shopping to see your orders here!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <img 
                        src={order.product.processedImage || order.product.originalImage || ''} 
                        alt={order.product.title}
                        className="w-16 aspect-[2/3] object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-card-foreground">{order.product.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Order #{order.id.slice(0, 8)}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="font-semibold text-primary">₵{parseFloat(order.totalAmount).toFixed(0)}</span>
                          <Badge variant={getOrderStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => handleViewOrderDetails(order)}
                          data-testid={`view-order-details-${order.id}`}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wishlist">
          <Card>
            <CardHeader>
              <CardTitle>Wishlist</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingWishlist ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-muted h-48 rounded-lg mb-2" />
                      <div className="bg-muted h-4 rounded mb-1" />
                      <div className="bg-muted h-3 rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : wishlist.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No items in your wishlist yet. Heart some products to save them here!</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {wishlist.map((product) => (
                    <Card key={product.id} className="overflow-hidden group">
                      <div className="relative">
                        <img 
                          src={product.processedImage || product.originalImage || ''} 
                          alt={product.title}
                          className="w-full aspect-[2/3] object-cover"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-1 right-1 bg-white/80 hover:bg-white w-6 h-6"
                          onClick={() => handleRemoveFromWishlist(product.id)}
                          data-testid={`remove-wishlist-${product.id}`}
                        >
                          <Heart className="h-3 w-3 text-destructive fill-destructive" />
                        </Button>
                      </div>
                      <CardContent className="p-2">
                        <h3 className="font-medium text-xs mb-1 truncate">{product.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2">by {product.seller.firstName}'s Store</p>
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-primary text-sm">₵{parseFloat(product.price).toFixed(0)}</span>
                          <Button size="sm" className="text-xs h-6" data-testid={`add-to-cart-wishlist-${product.id}`}>
                            Add to Cart
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">Receive updates about your orders and promotions</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleEmailNotifications} data-testid="configure-email-notifications">Configure</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">SMS Notifications</h4>
                    <p className="text-sm text-muted-foreground">Get delivery updates via SMS</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSmsNotifications} data-testid="configure-sms-notifications">Configure</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Privacy Settings</h4>
                    <p className="text-sm text-muted-foreground">Manage your data and privacy preferences</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePrivacySettings} data-testid="manage-privacy-settings">Manage</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Change Password</h4>
                    <p className="text-sm text-muted-foreground">Update your account password</p>
                  </div>
                  <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="change-password-button">
                        <Shield className="h-4 w-4 mr-2" />
                        Change
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                      </DialogHeader>
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                          <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} data-testid="current-password-input" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} data-testid="new-password-input" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={passwordForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} data-testid="confirm-password-input" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end space-x-4">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => {
                                setIsChangingPassword(false);
                                passwordForm.reset();
                              }}
                              data-testid="cancel-password-button"
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={changePasswordMutation.isPending}
                              data-testid="save-password-button"
                            >
                              {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline" size="sm">Enable</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Download Your Data</h4>
                    <p className="text-sm text-muted-foreground">Get a copy of your account data</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadData}
                    disabled={downloadDataMutation.isPending}
                    data-testid="download-data-button"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloadDataMutation.isPending ? "Downloading..." : "Download"}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-destructive">Delete Account</h4>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and data</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleDeleteAccount}
                    disabled={deleteAccountMutation.isPending}
                    data-testid="delete-account-button"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteAccountMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
                
                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    data-testid="logout-button"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {logoutMutation.isPending ? "Logging out..." : "Log Out"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Role-specific Settings */}
            {user.role === 'seller' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Business Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Store Information</h4>
                        <p className="text-sm text-muted-foreground">Manage your store name, description, and policies</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleEditStore} data-testid="edit-store-button">Edit Store</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Shipping Settings</h4>
                        <p className="text-sm text-muted-foreground">Configure delivery options and rates</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleShippingSettings} data-testid="configure-shipping-settings">Configure</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Return Policy</h4>
                        <p className="text-sm text-muted-foreground">Set your return and refund policies</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleReturnPolicy} data-testid="manage-return-policy">Manage</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Seller Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Order Notifications</h4>
                        <p className="text-sm text-muted-foreground">Get alerts for new orders and order updates</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleOrderNotifications} data-testid="configure-order-notifications">Configure</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Performance Reports</h4>
                        <p className="text-sm text-muted-foreground">Receive weekly sales and performance summaries</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handlePerformanceReports} data-testid="enable-performance-reports">Enable</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Inventory Alerts</h4>
                        <p className="text-sm text-muted-foreground">Get notified when items are low in stock</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleInventoryAlerts} data-testid="set-inventory-alerts">Set Alerts</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment & Finance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Payment Methods</h4>
                        <p className="text-sm text-muted-foreground">Manage how you receive payments</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handlePaymentMethods} data-testid="manage-payment-methods">Manage</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Tax Information</h4>
                        <p className="text-sm text-muted-foreground">Update your tax details and VAT settings</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleTaxInformation} data-testid="update-tax-information">Update</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Commission Settings</h4>
                        <p className="text-sm text-muted-foreground">View platform fees and commission structure</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleCommissionSettings} data-testid="view-commission-details">View Details</Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {user.role === 'buyer' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Shopping Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Default Payment Method</h4>
                        <p className="text-sm text-muted-foreground">Set your preferred payment option</p>
                      </div>
                      <Button variant="outline" size="sm">Manage</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Shipping Addresses</h4>
                        <p className="text-sm text-muted-foreground">Manage your delivery addresses</p>
                      </div>
                      <Button variant="outline" size="sm">Edit Addresses</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Size & Style Preferences</h4>
                        <p className="text-sm text-muted-foreground">Set your preferred sizes and styles for better recommendations</p>
                      </div>
                      <Button variant="outline" size="sm">Set Preferences</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Purchase Notifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Order Updates</h4>
                        <p className="text-sm text-muted-foreground">Get notified about your order status</p>
                      </div>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Price Drop Alerts</h4>
                        <p className="text-sm text-muted-foreground">Get notified when wishlist items go on sale</p>
                      </div>
                      <Button variant="outline" size="sm">Enable</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">New Arrivals</h4>
                        <p className="text-sm text-muted-foreground">Be the first to know about new products in your favorite categories</p>
                      </div>
                      <Button variant="outline" size="sm">Subscribe</Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
