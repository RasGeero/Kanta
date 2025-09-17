import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  image: string;
  size?: string;
  color?: string;
  condition: string;
  seller: string;
  quantity: number;
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [discount, setDiscount] = useState(0);
  const { toast } = useToast();

  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem('kantamanto_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart:', error);
        localStorage.removeItem('kantamanto_cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem('kantamanto_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }

    setCartItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setCartItems(items => items.filter(item => item.id !== itemId));
    toast({
      title: "Item removed",
      description: "Item has been removed from your cart.",
    });
  };

  const clearCart = () => {
    setCartItems([]);
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart.",
    });
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
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = (subtotal * discount) / 100;
  const deliveryFee = cartItems.length > 0 ? 15 : 0;
  const total = subtotal - discountAmount + deliveryFee;

  // Mock cart items for demo if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      const mockItems: CartItem[] = [
        {
          id: "cart-1",
          productId: "product-1",
          title: "African Print Dress",
          price: 95,
          image: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500",
          size: "M",
          color: "Multi-color",
          condition: "excellent",
          seller: "Ama's Closet",
          quantity: 1,
        },
        {
          id: "cart-2",
          productId: "product-2", 
          title: "Vintage Denim Jacket",
          price: 150,
          image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500",
          size: "L",
          color: "Blue",
          condition: "good",
          seller: "Kwaku's Vintage",
          quantity: 1,
        },
      ];
      setCartItems(mockItems);
    }
  }, []);

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
                          src={item.image} 
                          alt={item.title}
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
                            {item.title}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">by {item.seller}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {item.size && (
                            <span className="text-xs bg-muted px-2 py-1 rounded">Size: {item.size}</span>
                          )}
                          {item.color && (
                            <span className="text-xs bg-muted px-2 py-1 rounded">Color: {item.color}</span>
                          )}
                          <span className="text-xs bg-muted px-2 py-1 rounded capitalize">{item.condition}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {/* Quantity Controls */}
                        <div className="flex items-center border rounded-lg">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
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
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
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
                            ₵{(item.price * item.quantity).toFixed(0)}
                          </p>
                          <p className="text-sm text-muted-foreground">₵{item.price}/each</p>
                        </div>
                        
                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
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
