import { useState } from "react";
import { X, Star, ShoppingCart, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { ProductWithSeller } from "@shared/schema";

interface ProductModalProps {
  product: ProductWithSeller | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (productId: string, size?: string) => void;
  onBuyNow?: (productId: string, size?: string) => void;
  onToggleWishlist?: (productId: string) => void;
  onContactSeller?: (sellerId: string) => void;
  isInWishlist?: boolean;
}

export default function ProductModal({ 
  product, 
  isOpen, 
  onClose, 
  onAddToCart, 
  onBuyNow,
  onToggleWishlist,
  onContactSeller,
  isInWishlist = false 
}: ProductModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!product) return null;

  // Product has a specific size, no need for selection in thrift marketplace
  const images = [product.processedImage || product.originalImage || '', ...(product.images || [])].filter(Boolean);

  const handleAddToCart = () => {
    onAddToCart?.(product.id, product.size || undefined);
  };

  const handleBuyNow = () => {
    onBuyNow?.(product.id, product.size || undefined);
  };

  const handleContactSeller = () => {
    onContactSeller?.(product.sellerId);
  };

  const handleToggleWishlist = () => {
    onToggleWishlist?.(product.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        data-testid={`product-modal-${product.id}`}
      >
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative">
              <img 
                src={images[currentImageIndex]} 
                alt={product.title}
                className="w-full aspect-[2/3] object-cover rounded-lg"
                data-testid={`product-modal-main-image-${product.id}`}
              />
              {product.processedImage && product.processedImage !== product.originalImage && (
                <div className="absolute top-4 left-4">
                  <Badge className="bg-accent text-accent-foreground">
                    AI Try-On Enhanced
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Thumbnail Images */}
            <div className="grid grid-cols-4 gap-2">
              {images.slice(0, 4).map((image, index) => (
                <img 
                  key={index}
                  src={image} 
                  alt={`Product view ${index + 1}`}
                  className={`w-full aspect-[2/3] object-cover rounded-lg cursor-pointer transition-opacity ${
                    index === currentImageIndex ? 'opacity-100 ring-2 ring-primary' : 'opacity-60 hover:opacity-100'
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                  data-testid={`product-modal-thumbnail-${product.id}-${index}`}
                />
              ))}
            </div>
          </div>
          
          {/* Product Details */}
          <div className="space-y-6">
            <DialogHeader>
              <div>
                <DialogTitle 
                  className="text-2xl mb-2"
                  data-testid={`product-modal-title-${product.id}`}
                >
                  {product.title}
                </DialogTitle>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${
                          product.averageRating && i < Math.floor(product.averageRating) 
                            ? 'text-accent fill-accent' 
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                  <span 
                    className="text-sm text-muted-foreground"
                    data-testid={`product-modal-reviews-${product.id}`}
                  >
                    {product.averageRating && product.averageRating > 0 
                      ? `${product.averageRating.toFixed(1)} (${product.reviewCount || 0} reviews)`
                      : "No reviews yet"
                    }
                  </span>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <span 
                  className="text-3xl font-bold text-primary"
                  data-testid={`product-modal-price-${product.id}`}
                >
                  GH₵{parseFloat(product.price).toFixed(0)}
                </span>
              </div>
              
              {/* Seller Info */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-bold">
                      {product.seller.firstName.charAt(0)}{product.seller.lastName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 
                      className="font-semibold text-card-foreground"
                      data-testid={`product-modal-seller-name-${product.id}`}
                    >
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
                    data-testid={`contact-seller-${product.id}`}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Chat
                  </Button>
                </div>
              </div>
              
              {/* Size Display */}
              {product.category !== "Accessories" && product.size && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Size</Label>
                  <div className="px-4 py-2 border rounded-lg bg-muted/50">
                    <span className="font-medium">{product.size}</span>
                  </div>
                </div>
              )}
              
              {/* Condition */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Condition</Label>
                <Badge variant="secondary">
                  {product.condition}
                </Badge>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  className="w-full"
                  onClick={handleAddToCart}
                  data-testid={`product-modal-add-to-cart-${product.id}`}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="secondary"
                    onClick={handleBuyNow}
                    data-testid={`product-modal-buy-now-${product.id}`}
                  >
                    Buy Now
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleToggleWishlist}
                    data-testid={`product-modal-wishlist-${product.id}`}
                  >
                    <Heart 
                      className={`h-4 w-4 mr-2 ${
                        isInWishlist ? 'text-destructive fill-destructive' : ''
                      }`}
                    />
                    {isInWishlist ? 'Saved' : 'Save'}
                  </Button>
                </div>
              </div>
              
              {/* Description */}
              {product.description && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Description</Label>
                  <p 
                    className="text-muted-foreground leading-relaxed"
                    data-testid={`product-modal-description-${product.id}`}
                  >
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
