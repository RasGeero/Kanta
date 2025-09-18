import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, CreditCard, Smartphone, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cartApi, orderApi } from "@/services/api";
import { paystack } from "@/services/paystack";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { queryClient } from "@/lib/queryClient";
import { insertOrderSchema } from "@shared/schema";
import { z } from "zod";
import type { CartItemWithProduct } from "@shared/schema";

const checkoutFormSchema = z.object({
  buyerName: z.string().min(2, "Name must be at least 2 characters"),
  buyerPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  deliveryAddress: z.string().min(10, "Address must be at least 10 characters"),
  deliveryCity: z.string().min(1, "City is required"),
  deliveryRegion: z.string().min(1, "Region is required"),
  paymentMethod: z.enum(["paystack", "mobile_money"]),
  mobileMoneyNetwork: z.string().optional(),
}).refine((data) => {
  if (data.paymentMethod === "mobile_money" && !data.mobileMoneyNetwork) {
    return false;
  }
  return true;
}, {
  message: "Mobile Money network is required when using Mobile Money payment",
  path: ["mobileMoneyNetwork"],
});

type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Mock user data - in production, get from authentication
  const buyerId = user?.id || "buyer-id-placeholder";
  const buyerEmail = user?.email || "buyer@example.com";

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      buyerName: "",
      buyerPhone: "",
      deliveryAddress: "",
      deliveryCity: "",
      deliveryRegion: "",
      paymentMethod: "paystack",
    },
  });

  // Fetch user's cart items
  const { data: cartItems = [], isLoading: isLoadingCart, refetch: refetchCart } = useQuery({
    queryKey: ['/api/cart', user?.id],
    queryFn: () => cartApi.getUserCart(),
    enabled: isAuthenticated,
    staleTime: 0, // Always fetch fresh cart data
  });

  // Create order mutation for each cart item
  const createOrdersMutation = useMutation({
    mutationFn: async (ordersData: z.infer<typeof insertOrderSchema>[]) => {
      const orders = [];
      for (const orderData of ordersData) {
        const order = await orderApi.createOrder(orderData);
        orders.push(order);
      }
      return orders;
    },
    onSuccess: (orders) => {
      toast({
        title: "Orders created successfully",
        description: "Proceed with payment to complete your orders.",
      });
      // Calculate total amount for all orders
      const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
      // Pass all order IDs for payment reference
      const orderIds = orders.map(order => order.id);
      initiatePayment(orderIds, totalAmount);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create orders. Please try again.",
        variant: "destructive",
      });
    },
  });

  const initiatePayment = async (orderIds: string[], amount: number) => {
    setIsProcessingPayment(true);
    
    try {
      const paymentMethod = form.getValues('paymentMethod');
      
      if (paymentMethod === 'paystack') {
        const paymentData = await paystack.initializePayment(buyerEmail, orderIds[0]);
        
        if (paymentData.status) {
          const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
          if (!publicKey) {
            throw new Error('Paystack public key not configured');
          }

          paystack.openPaystackModal({
            publicKey,
            email: buyerEmail,
            amount: amount,
            currency: 'GHS',
            reference: paymentData.data.reference,
            metadata: { orderIds: orderIds },
            onSuccess: async (response) => {
              // Verify payment on success
              try {
                const verificationResult = await paystack.verifyPayment(response.reference);
                
                // Check both API success and transaction status
                const isPaymentSuccessful = 
                  verificationResult.status === true &&
                  verificationResult.data?.status === 'success' &&
                  verificationResult.data?.currency === 'GHS' &&
                  verificationResult.data?.amount === (amount * 100) && // Validate amount in kobo
                  verificationResult.data?.metadata?.orderIds && 
                  Array.isArray(verificationResult.data.metadata.orderIds) &&
                  verificationResult.data.metadata.orderIds.every((id: string) => orderIds.includes(id));
                
                if (isPaymentSuccessful) {
                  // Update all orders to paid status with payment reference
                  const paymentReference = verificationResult.data.reference;
                  await Promise.all(
                    orderIds.map(orderId => 
                      orderApi.updateOrder(orderId, { 
                        status: 'paid', 
                        paymentReference 
                      })
                    )
                  );
                  
                  // Clear cart after successful payment
                  await cartApi.clearCart();
                  
                  // Invalidate cart and orders queries
                  queryClient.invalidateQueries({ queryKey: ['/api/cart', user?.id] });
                  queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
                  
                  toast({
                    title: "Payment successful",
                    description: "Your orders have been placed successfully!",
                  });
                  setLocation('/profile');
                } else {
                  console.error('Payment verification failed:', verificationResult);
                  throw new Error('Payment verification failed - transaction not successful');
                }
              } catch (error) {
                console.error('Payment verification error:', error);
                toast({
                  title: "Payment verification failed",
                  description: "Please contact support if payment was deducted.",
                  variant: "destructive",
                });
              }
              setIsProcessingPayment(false);
            },
            onClose: () => {
              setIsProcessingPayment(false);
            },
          });
        }
      } else {
        // Mobile Money payment
        const network = form.getValues('mobileMoneyNetwork');
        const phone = form.getValues('buyerPhone');
        
        const result = await paystack.initiateMobileMoneyPayment(
          amount,
          phone,
          network as 'mtn' | 'vodafone' | 'airteltigo',
          orderIds[0]
        );
        
        if (result.success) {
          toast({
            title: "Payment initiated",
            description: result.message,
          });
          // Simulate payment completion
          setTimeout(async () => {
            try {
              // Update all orders to paid status with mobile money reference
              await Promise.all(
                orderIds.map(orderId => 
                  orderApi.updateOrder(orderId, { 
                    status: 'paid', 
                    paymentReference: result.reference 
                  })
                )
              );
              
              // Clear cart after successful payment
              await cartApi.clearCart();
              
              // Invalidate cart and orders queries
              queryClient.invalidateQueries({ queryKey: ['/api/cart', user?.id] });
              queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
              
              toast({
                title: "Payment successful",
                description: "Your mobile money payment has been processed!",
              });
              setLocation('/profile');
            } catch (error) {
              console.error('Error updating orders after mobile money payment:', error);
              toast({
                title: "Payment processed",
                description: "Payment completed but there was an issue updating orders. Please contact support.",
                variant: "destructive",
              });
            }
            setIsProcessingPayment(false);
          }, 3000);
        } else {
          throw new Error(result.message);
        }
      }
    } catch (error) {
      toast({
        title: "Payment failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessingPayment(false);
    }
  };

  const onSubmit = (data: CheckoutFormData) => {
    if (!cartItems.length) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart before checking out.",
        variant: "destructive",
      });
      return;
    }

    const deliveryFee = 15; // Fixed delivery fee
    
    // Create order for each cart item
    const ordersData = cartItems.map((item: CartItemWithProduct) => {
      const itemTotal = parseFloat(item.product.price) * item.quantity;
      const itemDeliveryFee = deliveryFee / cartItems.length; // Split delivery fee among items
      
      return {
        buyerId,
        sellerId: item.product.sellerId,
        productId: item.productId,
        quantity: item.quantity,
        totalAmount: (itemTotal + itemDeliveryFee).toString(),
        deliveryFee: itemDeliveryFee.toString(),
        paymentMethod: data.paymentMethod,
        deliveryAddress: data.deliveryAddress,
        deliveryCity: data.deliveryCity,
        deliveryRegion: data.deliveryRegion,
        buyerPhone: data.buyerPhone,
        buyerName: data.buyerName,
      };
    });

    createOrdersMutation.mutate(ordersData);
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
            <p className="text-muted-foreground mb-4">You need to be signed in to checkout.</p>
            <Button onClick={() => setLocation('/')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!cartItems.length && !isLoadingCart) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">No Items in Cart</h2>
            <p className="text-muted-foreground mb-4">Please add items to your cart to checkout.</p>
            <Button onClick={() => setLocation('/cart')}>Go to Cart</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingCart) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3 mx-auto" />
              <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate totals for all cart items
  const deliveryFee = 15;
  const subtotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
  const total = subtotal + deliveryFee;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLocation('/cart')}
          data-testid="back-button"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cart
        </Button>
        <h1 className="text-3xl font-bold mt-4 mb-2">Secure Checkout</h1>
        <p className="text-muted-foreground">Pay safely with Paystack and Mobile Money</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.map((item, index) => (
                <div key={item.id}>
                  {index > 0 && <div className="border-t pt-4" />}
                  <div className="flex items-center space-x-4">
                    <img 
                      src={item.product.originalImage || 'https://images.unsplash.com/photo-1596783074918-c84cb06531ca'} 
                      alt={item.product.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-card-foreground">{item.product.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.size && `Size ${item.size}, `}{item.product.condition} condition
                      </p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-semibold text-card-foreground">₵{(parseFloat(item.product.price) * item.quantity).toFixed(0)}</span>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-card-foreground" data-testid="subtotal">₵{subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="text-card-foreground" data-testid="delivery-fee">₵{deliveryFee}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span className="text-card-foreground">Total</span>
                  <span className="text-primary" data-testid="total-amount">₵{total.toFixed(0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Checkout Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Payment Method */}
                  <div>
                    <Label className="text-base font-semibold mb-4 block">Payment Method</Label>
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup 
                              value={field.value} 
                              onValueChange={field.onChange}
                              className="grid grid-cols-2 gap-4"
                            >
                              <Label className="flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-muted [&:has([data-state=checked])]:border-primary">
                                <RadioGroupItem value="paystack" />
                                <CreditCard className="h-5 w-5 text-primary" />
                                <div>
                                  <h4 className="font-semibold">Paystack</h4>
                                  <p className="text-sm text-muted-foreground">Card, Bank Transfer</p>
                                </div>
                              </Label>
                              <Label className="flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-muted [&:has([data-state=checked])]:border-primary">
                                <RadioGroupItem value="mobile_money" />
                                <Smartphone className="h-5 w-5 text-accent" />
                                <div>
                                  <h4 className="font-semibold">Mobile Money</h4>
                                  <p className="text-sm text-muted-foreground">MTN, Vodafone, AirtelTigo</p>
                                </div>
                              </Label>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Mobile Money Network Selection */}
                  {form.watch('paymentMethod') === 'mobile_money' && (
                    <FormField
                      control={form.control}
                      name="mobileMoneyNetwork"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Money Network</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="momo-network-select">
                                <SelectValue placeholder="Select your network" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                              <SelectItem value="vodafone">Vodafone Cash</SelectItem>
                              <SelectItem value="airteltigo">AirtelTigo Money</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Delivery Information */}
                  <div>
                    <Label className="text-base font-semibold mb-4 block">Delivery Information</Label>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="buyerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} data-testid="buyer-name-input" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="buyerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+233 XX XXX XXXX" {...field} data-testid="buyer-phone-input" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deliveryAddress"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Delivery Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your delivery address" {...field} data-testid="delivery-address-input" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deliveryCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="delivery-city-select">
                                  <SelectValue placeholder="Select City" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Accra">Accra</SelectItem>
                                <SelectItem value="Kumasi">Kumasi</SelectItem>
                                <SelectItem value="Tamale">Tamale</SelectItem>
                                <SelectItem value="Cape Coast">Cape Coast</SelectItem>
                                <SelectItem value="Takoradi">Takoradi</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deliveryRegion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="delivery-region-select">
                                  <SelectValue placeholder="Select Region" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Greater Accra">Greater Accra</SelectItem>
                                <SelectItem value="Ashanti">Ashanti</SelectItem>
                                <SelectItem value="Northern">Northern</SelectItem>
                                <SelectItem value="Central">Central</SelectItem>
                                <SelectItem value="Western">Western</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full"
                    disabled={createOrdersMutation.isPending || isProcessingPayment}
                    data-testid="place-order-button"
                  >
                    <Lock className="h-5 w-5 mr-2" />
                    {isProcessingPayment ? "Processing..." : `Pay ₵${total.toFixed(0)} Securely`}
                  </Button>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      <Lock className="h-4 w-4 inline mr-1" />
                      Your payment is secured by Paystack
                    </p>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
