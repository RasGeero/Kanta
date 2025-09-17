import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams, useLocation } from "wouter";
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
import { productApi, orderApi } from "@/services/api";
import { paystack } from "@/services/paystack";
import { useToast } from "@/hooks/use-toast";
import { insertOrderSchema } from "@shared/schema";
import { z } from "zod";

const checkoutFormSchema = z.object({
  buyerName: z.string().min(2, "Name must be at least 2 characters"),
  buyerPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  deliveryAddress: z.string().min(10, "Address must be at least 10 characters"),
  deliveryCity: z.string().min(1, "City is required"),
  deliveryRegion: z.string().min(1, "Region is required"),
  paymentMethod: z.enum(["paystack", "mobile_money"]),
  mobileMoneyNetwork: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

export default function Checkout() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const productId = searchParams.get('productId');
  const size = searchParams.get('size');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { toast } = useToast();

  // Mock user data - in production, get from authentication
  const buyerId = "buyer-id-placeholder";
  const buyerEmail = "buyer@example.com";

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

  // Fetch product details
  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['/api/products', productId],
    queryFn: () => productApi.getProduct(productId!),
    enabled: !!productId,
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (orderData: z.infer<typeof insertOrderSchema>) => orderApi.createOrder(orderData),
    onSuccess: (order) => {
      toast({
        title: "Order created successfully",
        description: "Proceed with payment to complete your order.",
      });
      // Navigate to payment
      initiatePayment(order.id, parseFloat(order.totalAmount));
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const initiatePayment = async (orderId: string, amount: number) => {
    setIsProcessingPayment(true);
    
    try {
      const paymentMethod = form.getValues('paymentMethod');
      
      if (paymentMethod === 'paystack') {
        const paymentData = await paystack.initializePayment(amount, buyerEmail, orderId);
        
        if (paymentData.status) {
          // In production, redirect to Paystack checkout
          paystack.openPaystackModal({
            publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder',
            email: buyerEmail,
            amount: amount,
            currency: 'GHS',
            reference: paymentData.data.reference,
            metadata: { orderId },
            onSuccess: (response) => {
              toast({
                title: "Payment successful",
                description: "Your order has been placed successfully!",
              });
              setLocation('/profile'); // Navigate to orders page
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
          orderId
        );
        
        if (result.success) {
          toast({
            title: "Payment initiated",
            description: result.message,
          });
          // Simulate payment completion
          setTimeout(() => {
            toast({
              title: "Payment successful",
              description: "Your mobile money payment has been processed!",
            });
            setLocation('/profile');
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
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const onSubmit = (data: CheckoutFormData) => {
    if (!product) return;

    const deliveryFee = 15; // Fixed delivery fee
    const totalAmount = parseFloat(product.price) + deliveryFee;

    const orderData = {
      buyerId,
      sellerId: product.sellerId,
      productId: product.id,
      quantity: 1,
      totalAmount: totalAmount.toString(),
      deliveryFee: deliveryFee.toString(),
      paymentMethod: data.paymentMethod,
      deliveryAddress: data.deliveryAddress,
      deliveryCity: data.deliveryCity,
      deliveryRegion: data.deliveryRegion,
      buyerPhone: data.buyerPhone,
      buyerName: data.buyerName,
    };

    createOrderMutation.mutate(orderData);
  };

  if (!productId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">No Product Selected</h2>
            <p className="text-muted-foreground mb-4">Please select a product to checkout.</p>
            <Button onClick={() => setLocation('/')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingProduct) {
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

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
            <p className="text-muted-foreground mb-4">The product you're trying to purchase was not found.</p>
            <Button onClick={() => setLocation('/')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deliveryFee = 15;
  const subtotal = parseFloat(product.price);
  const total = subtotal + deliveryFee;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLocation(`/product/${productId}`)}
          data-testid="back-button"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Product
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
              <div className="flex items-center space-x-4">
                <img 
                  src={product.processedImage || product.originalImage} 
                  alt={product.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-card-foreground">{product.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Size {size || product.size}, {product.condition} condition
                  </p>
                </div>
                <span className="font-semibold text-card-foreground">₵{subtotal.toFixed(0)}</span>
              </div>
              
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
                    disabled={createOrderMutation.isPending || isProcessingPayment}
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
