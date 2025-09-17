import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Filter, ShoppingBag, Store, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProductCard from "@/components/product/product-card";
import ProductModal from "@/components/product/product-modal";
import { productApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import type { ProductWithSeller } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedSize, setSelectedSize] = useState("Any Size");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductWithSeller | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch featured products
  const { data: featuredProducts = [], isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['/api/products/featured'],
    queryFn: () => productApi.getFeaturedProducts(8),
  });

  const handleSearch = () => {
    // Navigate to search page with filters
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (selectedCategory && selectedCategory !== 'All Categories') params.append('category', selectedCategory);
    if (selectedSize && selectedSize !== 'Any Size') params.append('size', selectedSize);
    if (maxPrice) params.append('maxPrice', maxPrice);
    
    window.location.href = `/search?${params.toString()}`;
  };

  const handleQuickFilter = (filter: string) => {
    const filterMap: Record<string, string> = {
      women: 'gender=women',
      men: 'gender=men',
      vintage: 'category=Vintage',
      affordable: 'maxPrice=100'
    };
    
    window.location.href = `/search?${filterMap[filter] || ''}`;
  };

  const handleProductClick = (product: ProductWithSeller) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleAddToCart = (productId: string) => {
    // TODO: Implement cart functionality
    toast({
      title: "Added to cart",
      description: "Product has been added to your cart.",
    });
  };

  const handleToggleWishlist = (productId: string) => {
    // TODO: Implement wishlist functionality
    toast({
      title: "Added to wishlist",
      description: "Product has been added to your wishlist.",
    });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg"></div>
        <div className="absolute inset-0 kente-pattern opacity-10"></div>
        <div className="relative container mx-auto px-4 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-6xl font-bold text-primary-foreground mb-6">
                Discover Ghana's
                <span className="text-accent block">Best Thrift</span>
                Fashion
              </h1>
              <p className="text-xl text-primary-foreground/90 mb-8 leading-relaxed">
                Shop authentic second-hand clothing from Kantamanto Market with AI-powered virtual try-on. 
                Find unique pieces while supporting local sellers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/search">
                  <Button 
                    size="lg" 
                    className="bg-accent text-accent-foreground hover:bg-accent/90 transform hover:scale-105 transition-all"
                    data-testid="hero-start-shopping"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Start Shopping
                  </Button>
                </Link>
                <Link href="/seller-dashboard">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="bg-card text-card-foreground border-2 border-card hover:bg-card/90"
                    data-testid="hero-become-seller"
                  >
                    <Store className="mr-2 h-5 w-5" />
                    Become a Seller
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Featured Products Preview */}
            <div className="grid grid-cols-2 gap-4">
              {featuredProducts.slice(0, 2).map((product) => (
                <Card 
                  key={product.id} 
                  className="overflow-hidden transform hover:scale-105 transition-transform cursor-pointer"
                  onClick={() => handleProductClick(product)}
                  data-testid={`hero-product-${product.id}`}
                >
                  <img 
                    src={product.processedImage || product.originalImage} 
                    alt={product.title}
                    className="w-full h-48 object-cover" 
                  />
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-card-foreground">{product.title}</h3>
                    <p className="text-primary font-bold">₵{parseFloat(product.price).toFixed(0)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="bg-muted py-8">
        <div className="container mx-auto px-4">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="grid lg:grid-cols-12 gap-4 items-end">
                {/* Search Input */}
                <div className="lg:col-span-4">
                  <label className="block text-sm font-medium text-card-foreground mb-2">Search Items</label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Find shirts, dresses, shoes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="search-input"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  </div>
                </div>
                
                {/* Category Filter */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-card-foreground mb-2">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Categories">All Categories</SelectItem>
                      <SelectItem value="Dresses">Dresses</SelectItem>
                      <SelectItem value="Shirts">Shirts</SelectItem>
                      <SelectItem value="Pants">Pants</SelectItem>
                      <SelectItem value="Shoes">Shoes</SelectItem>
                      <SelectItem value="Accessories">Accessories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Size Filter */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-card-foreground mb-2">Size</label>
                  <Select value={selectedSize} onValueChange={setSelectedSize}>
                    <SelectTrigger data-testid="size-select">
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
                
                {/* Price Range */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-card-foreground mb-2">Max Price (₵)</label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    data-testid="max-price-input"
                  />
                </div>
                
                {/* Search Button */}
                <div className="lg:col-span-2">
                  <Button 
                    className="w-full" 
                    onClick={handleSearch}
                    data-testid="filter-button"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </div>
              </div>
              
              {/* Quick Filters */}
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Popular:</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-accent/20 text-accent border-accent/30 hover:bg-accent/30"
                  onClick={() => handleQuickFilter('women')}
                  data-testid="quick-filter-women"
                >
                  Women's Fashion
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-accent/20 text-accent border-accent/30 hover:bg-accent/30"
                  onClick={() => handleQuickFilter('men')}
                  data-testid="quick-filter-men"
                >
                  Men's Fashion
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-accent/20 text-accent border-accent/30 hover:bg-accent/30"
                  onClick={() => handleQuickFilter('vintage')}
                  data-testid="quick-filter-vintage"
                >
                  Vintage Style
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-accent/20 text-accent border-accent/30 hover:bg-accent/30"
                  onClick={() => handleQuickFilter('affordable')}
                  data-testid="quick-filter-affordable"
                >
                  Under ₵100
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Trending in Kantamanto</h2>
            <p className="text-xl text-muted-foreground">Handpicked items with AI-enhanced try-on experience</p>
          </div>
          
          {isLoadingFeatured ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted h-64 rounded-lg mb-4"></div>
                  <div className="bg-muted h-4 rounded mb-2"></div>
                  <div className="bg-muted h-4 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <div key={product.id} onClick={() => handleProductClick(product)}>
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                    onToggleWishlist={handleToggleWishlist}
                  />
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link href="/search">
              <Button 
                size="lg" 
                variant="secondary"
                data-testid="view-all-products"
              >
                View All Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Seller Dashboard Preview */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Seller Dashboard</h2>
            <p className="text-xl text-muted-foreground">Manage your thrift business with powerful tools</p>
          </div>
          
          <Card className="shadow-lg overflow-hidden">
            {/* Dashboard Header */}
            <div className="gradient-bg p-6 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Welcome back, Seller!</h3>
                  <p className="opacity-90">Your store performance this month</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <Store className="text-2xl h-8 w-8" />
                </div>
              </div>
            </div>
            
            {/* Dashboard Content */}
            <CardContent className="p-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="bg-accent/20 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <i className="fas fa-coins text-accent text-xl"></i>
                  </div>
                  <h4 className="text-2xl font-bold text-card-foreground">₵2,450</h4>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                </div>
                <div className="text-center">
                  <div className="bg-primary/20 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <ShoppingBag className="text-primary h-6 w-6" />
                  </div>
                  <h4 className="text-2xl font-bold text-card-foreground">47</h4>
                  <p className="text-sm text-muted-foreground">Orders</p>
                </div>
                <div className="text-center">
                  <div className="bg-secondary/20 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <i className="fas fa-eye text-secondary text-xl"></i>
                  </div>
                  <h4 className="text-2xl font-bold text-card-foreground">1,203</h4>
                  <p className="text-sm text-muted-foreground">Product Views</p>
                </div>
                <div className="text-center">
                  <div className="bg-accent/20 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <i className="fas fa-star text-accent text-xl"></i>
                  </div>
                  <h4 className="text-2xl font-bold text-card-foreground">4.8</h4>
                  <p className="text-sm text-muted-foreground">Rating</p>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="grid md:grid-cols-3 gap-4">
                <Link href="/seller-dashboard">
                  <Button 
                    className="w-full h-auto p-4 text-left justify-start"
                    data-testid="seller-add-product"
                  >
                    <div>
                      <i className="fas fa-plus text-xl mb-2 block"></i>
                      <h4 className="font-semibold">Add New Product</h4>
                      <p className="text-sm opacity-90">Upload and list new items</p>
                    </div>
                  </Button>
                </Link>
                <Link href="/seller-dashboard">
                  <Button 
                    variant="secondary" 
                    className="w-full h-auto p-4 text-left justify-start"
                    data-testid="seller-manage-orders"
                  >
                    <div>
                      <i className="fas fa-list-alt text-xl mb-2 block"></i>
                      <h4 className="font-semibold">Manage Orders</h4>
                      <p className="text-sm opacity-90">View and update order status</p>
                    </div>
                  </Button>
                </Link>
                <Link href="/seller-dashboard">
                  <Button 
                    variant="outline" 
                    className="w-full h-auto p-4 text-left justify-start bg-accent text-accent-foreground hover:bg-accent/90"
                    data-testid="seller-view-analytics"
                  >
                    <div>
                      <i className="fas fa-chart-bar text-xl mb-2 block"></i>
                      <h4 className="font-semibold">View Analytics</h4>
                      <p className="text-sm opacity-90">Detailed sales reports</p>
                    </div>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

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
