import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { cartApi, wishlistApi } from "@/services/api";
import { useAuth } from "@/contexts/auth-context";
import { queryClient } from "@/lib/queryClient";
import { Filter, SlidersHorizontal, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import ProductCard from "@/components/product/product-card";
import ProductModal from "@/components/product/product-modal";
import { productApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import type { ProductWithSeller } from "@shared/schema";

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [size, setSize] = useState("Any Size");
  const [color, setColor] = useState("");
  const [gender, setGender] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProduct, setSelectedProduct] = useState<ProductWithSeller | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Parse URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('search')) setSearchQuery(params.get('search') || '');
    if (params.get('category')) setCategory(params.get('category') || 'All Categories');
    if (params.get('size')) setSize(params.get('size') || 'Any Size');
    if (params.get('color')) setColor(params.get('color') || '');
    if (params.get('gender')) setGender(params.get('gender') || 'all');
    if (params.get('minPrice')) setMinPrice(params.get('minPrice') || '');
    if (params.get('maxPrice')) setMaxPrice(params.get('maxPrice') || '');
  }, []);

  // Build search query
  const searchParams = {
    search: searchQuery || undefined,
    category: category !== 'All Categories' ? category : undefined,
    size: size !== 'Any Size' ? size : undefined,
    color: color || undefined,
    gender: gender !== 'all' ? gender : undefined,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    limit: 50,
  };

  // Fetch products
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/products/search', searchParams],
    queryFn: () => productApi.searchProducts(searchParams),
  });

  // Sort products
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return parseFloat(a.price) - parseFloat(b.price);
      case 'price-high':
        return parseFloat(b.price) - parseFloat(a.price);
      case 'popular':
        return (b.views || 0) - (a.views || 0);
      case 'rating':
        return (b.averageRating || 0) - (a.averageRating || 0);
      default:
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
  });

  const handleSearch = () => {
    refetch();
    setIsFilterOpen(false);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setCategory("All Categories");
    setSize("Any Size");
    setColor("");
    setGender("all");
    setMinPrice("");
    setMaxPrice("");
    
    // Update URL
    window.history.pushState({}, '', '/search');
    
    refetch();
  };

  const handleProductClick = (product: ProductWithSeller) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: ({ productId, size }: { productId: string; size?: string }) => 
      cartApi.addToCart(productId, 1, size),
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

  const handleAddToCart = (productId: string, size?: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your cart.",
        variant: "destructive",
      });
      return;
    }
    addToCartMutation.mutate({ productId, size });
  };

  // Add to wishlist mutation
  // Fetch user's wishlist to check product status
  const { data: userWishlist = [] } = useQuery({
    queryKey: ['/api/wishlist'],
    queryFn: () => wishlistApi.getUserWishlist(),
    enabled: isAuthenticated,
  });

  const addToWishlistMutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.addToWishlist(productId),
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

  const removeFromWishlistMutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.removeFromWishlist(productId),
    onSuccess: () => {
      toast({
        title: "Removed from wishlist",
        description: "Product has been removed from your wishlist.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove product from wishlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggleWishlist = (productId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your wishlist.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if product is in wishlist
    const isInWishlist = userWishlist.some((item: ProductWithSeller) => item.id === productId);
    
    if (isInWishlist) {
      removeFromWishlistMutation.mutate(productId);
    } else {
      addToWishlistMutation.mutate(productId);
    }
  };

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Search</label>
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="search-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid="category-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Categories">All Categories</SelectItem>
            <SelectItem value="Dresses">Dresses</SelectItem>
            <SelectItem value="Shirts">Shirts</SelectItem>
            <SelectItem value="Pants">Pants</SelectItem>
            <SelectItem value="Jackets">Jackets</SelectItem>
            <SelectItem value="Shoes">Shoes</SelectItem>
            <SelectItem value="Accessories">Accessories</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Size</label>
        <Select value={size} onValueChange={setSize}>
          <SelectTrigger data-testid="size-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Any Size">Any Size</SelectItem>
            <SelectItem value="XS">XS</SelectItem>
            <SelectItem value="S">S</SelectItem>
            <SelectItem value="M">M</SelectItem>
            <SelectItem value="L">L</SelectItem>
            <SelectItem value="XL">XL</SelectItem>
            <SelectItem value="XXL">XXL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Gender</label>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger data-testid="gender-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="men">Men</SelectItem>
            <SelectItem value="women">Women</SelectItem>
            <SelectItem value="unisex">Unisex</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Color</label>
        <Input
          placeholder="e.g., Red, Blue, Multi-color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          data-testid="color-filter"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Min Price (₵)</label>
          <Input
            type="number"
            placeholder="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            data-testid="min-price-filter"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Max Price (₵)</label>
          <Input
            type="number"
            placeholder="1000"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            data-testid="max-price-filter"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Button 
          className="w-full" 
          onClick={handleSearch}
          data-testid="apply-filters-button"
        >
          Apply Filters
        </Button>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleClearFilters}
          data-testid="clear-filters-button"
        >
          Clear All
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Search Products</h1>
          <p className="text-muted-foreground">
            {products.length} {products.length === 1 ? 'product' : 'products'} found
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="hidden md:flex border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              data-testid="grid-view-button"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="list-view-button"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40" data-testid="sort-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
            </SelectContent>
          </Select>

          {/* Mobile Filter Button */}
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="md:hidden" data-testid="mobile-filter-button">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Desktop Filters Sidebar */}
        <div className="hidden lg:block">
          <Card className="sticky top-24">
            <CardContent className="p-6">
              <div className="flex items-center mb-6">
                <Filter className="h-5 w-5 mr-2" />
                <h2 className="text-lg font-semibold">Filters</h2>
              </div>
              <FilterContent />
            </CardContent>
          </Card>
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-3">
          {/* Active Filters */}
          {(searchQuery || category !== 'All Categories' || size !== 'Any Size' || color || gender !== 'all' || minPrice || maxPrice) && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary">Search: {searchQuery}</Badge>
                )}
                {category !== 'All Categories' && (
                  <Badge variant="secondary">Category: {category}</Badge>
                )}
                {size !== 'Any Size' && (
                  <Badge variant="secondary">Size: {size}</Badge>
                )}
                {color && (
                  <Badge variant="secondary">Color: {color}</Badge>
                )}
                {gender !== 'all' && (
                  <Badge variant="secondary">Gender: {gender}</Badge>
                )}
                {minPrice && (
                  <Badge variant="secondary">Min: ₵{minPrice}</Badge>
                )}
                {maxPrice && (
                  <Badge variant="secondary">Max: ₵{maxPrice}</Badge>
                )}
              </div>
            </div>
          )}

          {/* Products */}
          {isLoading ? (
            <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1"}`}>
              {[...Array(9)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted h-64 rounded-lg mb-4"></div>
                  <div className="bg-muted h-4 rounded mb-2"></div>
                  <div className="bg-muted h-4 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search criteria or browse our categories
                </p>
                <Button onClick={handleClearFilters} data-testid="clear-filters-no-results">
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {sortedProducts.map((product) => {
                const isInWishlist = userWishlist.some((item: ProductWithSeller) => item.id === product.id);
                return (
                  <div key={product.id} onClick={() => handleProductClick(product)}>
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                      onToggleWishlist={handleToggleWishlist}
                      isInWishlist={isInWishlist}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedProducts.map((product) => (
                <Card 
                  key={product.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleProductClick(product)}
                  data-testid={`product-list-item-${product.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <img 
                        src={product.processedImage || product.originalImage || ''} 
                        alt={product.title}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{product.title}</h3>
                        <p className="text-muted-foreground">by {product.seller.firstName}'s Store</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{product.category}</Badge>
                          <Badge variant="outline">{product.size}</Badge>
                          <Badge variant="outline">{product.condition}</Badge>
                        </div>
                        {product.averageRating && product.averageRating > 0 && (
                          <div className="flex items-center space-x-1 mt-2">
                            <span className="text-sm">⭐ {product.averageRating}</span>
                            <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">₵{parseFloat(product.price).toFixed(0)}</p>
                        <p className="text-sm text-muted-foreground">{product.views} views</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
      />
    </div>
  );
}
