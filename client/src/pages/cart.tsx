import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { cartApi } from "@/services/api";
import { useAuth } from "@/contexts/auth-context";
import { queryClient } from "@/lib/queryClient";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

import type { CartItemWithProduct } from "@shared/schema";

export default function Cart() {
  const [promoCode, setPromoCode] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [discount, setDiscount] = useState(0);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Fetch user's cart from backend
  const { data: cartItems = [], isLoading: isLoadingCart, refetch: refetchCart } = useQuery({
    queryKey: ['/api/cart', user?.id],
    queryFn: () => cartApi.getUserCart(),
    enabled: isAuthenticated,
    staleTime: 0, // Always fetch fresh cart data
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity, size }: { productId: string; quantity: number; size?: string }) => 
      cartApi.updateCartQuantity(productId, quantity, size),
    onSuccess: () => {
      refetchCart();
      toast({
        title: "Cart updated",
        description: "Item quantity has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update cart. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateQuantity = (item: CartItemWithProduct, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(item);
      return;
    }
    updateQuantityMutation.mutate({ 
      productId: item.productId, 
      quantity: newQuantity, 
      size: item.size || undefined
    });
  };

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: ({ productId, size }: { productId: string; size?: string }) => 
      cartApi.removeFromCart(productId, size),
    onSuccess: () => {
      refetchCart();
      toast({
        title: "Item removed",
        description: "Item has been removed from your cart.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeItem = (item: CartItemWithProduct) => {
    removeItemMutation.mutate({ 
      productId: item.productId, 
      size: item.size || undefined
    });
  };

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: () => cartApi.clearCart(),
    onSuccess: () => {
      refetchCart();
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear cart. Please try again.",
        variant: "destructive",
      });
    },
  });

  const clearCart = () => {
    clearCartMutation.mutate();
  };

  const applyPromoCode = () => {
    setIsApplyingPromo(true);
    
    // Simulate promo code validation
    setTimeout(() => {
      const validCodes = {
        'WELCOME10': 10,
        'THRIFT20': 20,
        'GHANA15': 15,
      };
      
      const discountPercent = validCodes[promoCode.toUpperCase() as keyof typeof validCodes];
      
      if (discountPercent) {
        setDiscount(discountPercent);
        toast({
          title: "Promo code applied",
          description: `You saved ${discountPercent}% on your order!`,
        });
      } else {
        toast({
          title: "Invalid promo code",
          description: "Please check your promo code and try again.",
          variant: "destructive",
        });
      }
      setIsApplyingPromo(false);
    }, 1000);
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
  const discountAmount = (subtotal * discount) / 100;
  const deliveryFee = cartItems.length > 0 ? 15 : 0;
  const total = subtotal - discountAmount + deliveryFee;

  // Show loading state
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Please Sign In</h1>
          <p className="text-muted-foreground mb-6">You need to be signed in to view your cart.</p>
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoadingCart) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Loading Cart...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
        <p className="text-muted-foreground">
          {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
        </p>
      </div>

      {cartItems.length === 0 ? (
        /* Empty Cart State */
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-semibold mb-4">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Looks like you haven't added anything to your cart yet. Start shopping to find some great deals!
            </p>
            <Link href="/search">
              <Button size="lg" data-testid="continue-shopping-empty">
                Start Shopping
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cart Items</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearCart}
                  data-testid="clear-cart-button"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cart
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 && <Separator />}
                    <div className="flex items-center space-x-4 py-4">
                      <Link href={`/product/${item.productId}`}>
                        <img 
                          src={item.product.originalImage || 'https://images.unsplash.com/photo-1596783074918-c84cb06531ca'} 
                          alt={item.product.title}
                          className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          data-testid={`cart-item-image-${item.id}`}
                        />
                      </Link>
                      
                      <div className="flex-1">
                        <Link href={`/product/${item.productId}`}>
                          <h3 
                            className="font-semibold text-card-foreground hover:text-primary cursor-pointer"
                            data-testid={`cart-item-title-${item.id}`}
                          >
                            {item.product.title}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">by {item.product.seller?.username || 'Unknown Seller'}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {item.size && (
                            <span className="text-xs bg-muted px-2 py-1 rounded">Size: {item.size}</span>
                          )}
                          {item.product.color && (
                            <span className="text-xs bg-muted px-2 py-1 rounded">Color: {item.product.color}</span>
                          )}
                          <span className="text-xs bg-muted px-2 py-1 rounded capitalize">{item.product.condition}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {/* Quantity Controls */}
                        <div className="flex items-center border rounded-lg">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            data-testid={`decrease-quantity-${item.id}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span 
                            className="px-3 py-2 text-sm font-medium"
                            data-testid={`quantity-${item.id}`}
                          >
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item, item.quantity + 1)}
                            data-testid={`increase-quantity-${item.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Price */}
                        <div className="text-right">
                          <p 
                            className="font-semibold text-primary"
                            data-testid={`item-total-${item.id}`}
                          >
                            ₵{(parseFloat(item.product.price) * item.quantity).toFixed(0)}
                          </p>
                          <p className="text-sm text-muted-foreground">₵{parseFloat(item.product.price).toFixed(0)}/each</p>
                        </div>
                        
                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item)}
                          data-testid={`remove-item-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            {/* Promo Code */}
            <Card>
              <CardHeader>
                <CardTitle>Promo Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    data-testid="promo-code-input"
                  />
                  <Button
                    variant="outline"
                    onClick={applyPromoCode}
                    disabled={!promoCode || isApplyingPromo}
                    data-testid="apply-promo-button"
                  >
                    {isApplyingPromo ? "Applying..." : "Apply"}
                  </Button>
                </div>
                {discount > 0 && (
                  <p className="text-sm text-accent">
                    ✓ {discount}% discount applied!
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span data-testid="cart-subtotal">₵{subtotal.toFixed(0)}</span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount ({discount}%)</span>
                      <span className="text-accent" data-testid="cart-discount">-₵{discountAmount.toFixed(0)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span data-testid="cart-delivery">₵{deliveryFee}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary" data-testid="cart-total">₵{total.toFixed(0)}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Link href="/checkout">
                    <Button className="w-full" size="lg" data-testid="checkout-button">
                      Proceed to Checkout
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  
                  <Link href="/search">
                    <Button variant="outline" className="w-full" data-testid="continue-shopping-button">
                      Continue Shopping
                    </Button>
                  </Link>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    Free delivery on orders over ₵200
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Trust Indicators */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-accent">✓</span>
                    <span>Secure payment with Paystack</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-accent">✓</span>
                    <span>Fast delivery across Ghana</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-accent">✓</span>
                    <span>Quality guaranteed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
