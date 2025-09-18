import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { cartApi, wishlistApi } from "@/services/api";
import { useAuth } from "@/contexts/auth-context";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Star, Heart, MessageCircle, ShoppingCart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { productApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function ProductDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [selectedSize, setSelectedSize] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['/api/products', id],
    queryFn: () => productApi.getProduct(id!),
    enabled: !!id,
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: () => cartApi.addToCart(id!, 1, selectedSize || undefined),
    onSuccess: () => {
      toast({
        title: "Added to cart",
        description: "Product has been added to your cart.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add product to cart. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your cart.",
        variant: "destructive",
      });
      return;
    }
    addToCartMutation.mutate();
  };

  const handleBuyNow = () => {
    // Navigate to checkout with this product
    window.location.href = `/checkout?productId=${id}&size=${selectedSize}`;
  };

  // Add to wishlist mutation
  const addToWishlistMutation = useMutation({
    mutationFn: () => wishlistApi.addToWishlist(id!),
    onSuccess: () => {
      toast({
        title: "Added to wishlist",
        description: "Product has been saved to your wishlist.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add product to wishlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggleWishlist = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your wishlist.",
        variant: "destructive",
      });
      return;
    }
    addToWishlistMutation.mutate();
  };

  const handleContactSeller = () => {
    toast({
      title: "Message sent",
      description: "Your message has been sent to the seller.",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.title,
        text: `Check out this ${product?.title} on Kantamanto`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Product link has been copied to clipboard.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Skeleton className="w-full h-96 rounded-lg" />
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="w-full h-20 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sizes = ["S", "M", "L", "XL"];
  const images = [product.processedImage || product.originalImage, ...(product.images || [])];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="back-button">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative">
            <img 
              src={images[currentImageIndex] || ''} 
              alt={product.title}
              className="w-full h-96 lg:h-[500px] object-cover rounded-lg"
              data-testid="product-main-image"
            />
            <div className="absolute top-4 left-4">
              <Badge className="bg-accent text-accent-foreground">
                AI Try-On Enhanced
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-white/80 hover:bg-white"
              onClick={handleShare}
              data-testid="share-button"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Thumbnail Images */}
          <div className="grid grid-cols-4 gap-2">
            {images.slice(0, 4).map((image, index) => (
              <img 
                key={index}
                src={image || ''} 
                alt={`Product view ${index + 1}`}
                className={`w-full h-20 object-cover rounded-lg cursor-pointer transition-opacity ${
                  index === currentImageIndex ? 'opacity-100 ring-2 ring-primary' : 'opacity-60 hover:opacity-100'
                }`}
                onClick={() => setCurrentImageIndex(index)}
                data-testid={`thumbnail-${index}`}
              />
            ))}
          </div>
        </div>
        
        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="product-title">
              {product.title}
            </h1>
            {product.averageRating && product.averageRating > 0 && (
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-4 w-4 ${
                        i < Math.floor(product.averageRating!) 
                          ? 'text-accent fill-accent' 
                          : 'text-muted'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground" data-testid="product-reviews">
                  ({product.reviewCount} reviews)
                </span>
              </div>
            )}
          </div>
          
          <div>
            <span className="text-4xl font-bold text-primary" data-testid="product-price">
              ₵{parseFloat(product.price).toFixed(0)}
            </span>
          </div>
          
          {/* Seller Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">
                    {product.seller.firstName.charAt(0)}{product.seller.lastName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-card-foreground" data-testid="seller-name">
                    {product.seller.firstName}'s Closet
                  </h4>
                  {product.averageRating && (
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-accent fill-accent" />
                      <span className="text-sm text-muted-foreground">
                        {product.averageRating} ({product.reviewCount} reviews)
                      </span>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleContactSeller}
                  data-testid="contact-seller"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Chat
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Product Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                <p className="font-medium">{product.category}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Color</Label>
                <p className="font-medium">{product.color}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Size</Label>
                <p className="font-medium">{product.size}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Condition</Label>
                <Badge variant="secondary" className="capitalize">
                  {product.condition}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Size Selection */}
          {product.category !== "Accessories" && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Available Sizes</Label>
              <RadioGroup value={selectedSize} onValueChange={setSelectedSize}>
                <div className="flex space-x-2">
                  {sizes.map((size) => (
                    <Label 
                      key={size} 
                      className="flex items-center space-x-2 cursor-pointer px-4 py-2 border rounded-lg hover:bg-muted"
                    >
                      <RadioGroupItem value={size} />
                      <span>{size}</span>
                    </Label>
                  ))}
                </div>
              </RadioGroup>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              className="w-full"
              size="lg"
              onClick={handleAddToCart}
              data-testid="add-to-cart-button"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="secondary"
                size="lg"
                onClick={handleBuyNow}
                data-testid="buy-now-button"
              >
                Buy Now
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={handleToggleWishlist}
                data-testid="wishlist-button"
              >
                <Heart className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
          
          <Separator />
          
          {/* Description */}
          {product.description && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Description</Label>
              <p className="text-muted-foreground leading-relaxed" data-testid="product-description">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
