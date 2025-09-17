import { useState } from "react";
import { Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductWithSeller } from "@shared/schema";

interface ProductCardProps {
  product: ProductWithSeller;
  onAddToCart?: (productId: string) => void;
  onToggleWishlist?: (productId: string) => void;
  isInWishlist?: boolean;
}

export default function ProductCard({ 
  product, 
  onAddToCart, 
  onToggleWishlist,
  isInWishlist = false 
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart?.(product.id);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleWishlist?.(product.id);
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden group hover:shadow-xl transition-all duration-300",
        isHovered && "scale-105"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`product-card-${product.id}`}
    >
      <div className="relative">
        <img 
          src={product.processedImage || product.originalImage} 
          alt={product.title}
          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
          data-testid={`product-image-${product.id}`}
        />
        <div className="absolute top-3 left-3">
          <Badge className="bg-accent text-accent-foreground">
            AI Try-On
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          <Button
            size="icon"
            variant="ghost"
            className="bg-card/80 hover:bg-card transition-colors"
            onClick={handleToggleWishlist}
            data-testid={`wishlist-toggle-${product.id}`}
          >
            <Heart 
              className={cn(
                "h-4 w-4",
                isInWishlist ? "text-destructive fill-destructive" : "text-muted-foreground"
              )}
            />
          </Button>
        </div>
      </div>
      
      <CardContent className="p-4">
        <h3 
          className="font-semibold text-card-foreground mb-1 truncate" 
          data-testid={`product-title-${product.id}`}
        >
          {product.title}
        </h3>
        <p 
          className="text-sm text-muted-foreground mb-2"
          data-testid={`product-seller-${product.id}`}
        >
          by {product.seller.firstName}'s Store
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <span 
            className="text-lg font-bold text-primary"
            data-testid={`product-price-${product.id}`}
          >
            ₵{parseFloat(product.price).toFixed(0)}
          </span>
          {product.averageRating && product.averageRating > 0 && (
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-accent fill-accent" />
              <span 
                className="text-sm text-muted-foreground"
                data-testid={`product-rating-${product.id}`}
              >
                {product.averageRating}
              </span>
            </div>
          )}
        </div>
        
        <Button 
          className="w-full" 
          onClick={handleAddToCart}
          data-testid={`add-to-cart-${product.id}`}
        >
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}
