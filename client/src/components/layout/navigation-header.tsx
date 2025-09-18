import { useState } from "react";
import { Link } from "wouter";
import { ShoppingBag, Heart, ShoppingCart, Menu, User, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cartApi, wishlistApi } from "@/services/api";
import type { ProductWithSeller, CartItemWithProduct } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import AuthModal from "@/components/auth/auth-modal";

export default function NavigationHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  
  const { user, isAuthenticated, logout } = useAuth();

  // Fetch cart items count
  const { data: cartItems = [] } = useQuery<CartItemWithProduct[]>({
    queryKey: ['/api/cart'],
    queryFn: () => cartApi.getUserCart(),
    enabled: isAuthenticated,
  });

  // Fetch wishlist items count
  const { data: wishlistItems = [] } = useQuery<ProductWithSeller[]>({
    queryKey: ['/api/wishlist'],
    queryFn: () => wishlistApi.getUserWishlist(),
    enabled: isAuthenticated,
  });

  // Calculate counts
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const wishlistCount = wishlistItems.length;

  const handleAuthModal = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getUserInitials = (user: any) => {
    if (!user) return "U";
    const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
    return initials || user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-4" data-testid="logo-link">
            <div className="gradient-bg p-2 rounded-lg">
              <ShoppingBag className="text-primary-foreground text-xl h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">Kantamanto</h1>
              <p className="text-xs text-muted-foreground">Ghana's Thrift Hub</p>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/search" 
              className="text-sm font-medium hover:text-primary transition-colors"
              data-testid="nav-browse"
            >
              Browse
            </Link>
            <Link 
              href="/seller-dashboard" 
              className="text-sm font-medium hover:text-primary transition-colors"
              data-testid="nav-sell"
            >
              Sell
            </Link>
            <Link 
              href="/profile" 
              className="text-sm font-medium hover:text-primary transition-colors"
              data-testid="nav-about"
            >
              About
            </Link>
            <div className="flex items-center space-x-2">
              {isAuthenticated && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    data-testid="wishlist-button"
                  >
                    <Heart className="h-5 w-5" />
                    {wishlistCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {wishlistCount}
                      </span>
                    )}
                  </Button>
                  <Link href="/cart">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative"
                      data-testid="cart-button"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {cartCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                </>
              )}
              
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getUserInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <Link href="/profile">
                      <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                    </Link>
                    {user?.role === 'seller' && (
                      <Link href="/seller-dashboard">
                        <DropdownMenuItem>
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          Seller Dashboard
                        </DropdownMenuItem>
                      </Link>
                    )}
                    {user?.role === 'admin' && (
                      <Link href="/admin">
                        <DropdownMenuItem>
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </DropdownMenuItem>
                      </Link>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="logout-button">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" onClick={() => handleAuthModal("login")} data-testid="login-button">
                    Sign In
                  </Button>
                  <Button onClick={() => handleAuthModal("register")} data-testid="register-button">
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </nav>
          
          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                data-testid="mobile-menu-trigger"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col space-y-4 mt-8">
                <Link 
                  href="/search" 
                  className="text-lg font-medium hover:text-primary transition-colors"
                  onClick={() => setIsOpen(false)}
                  data-testid="mobile-nav-browse"
                >
                  Browse
                </Link>
                <Link 
                  href="/seller-dashboard" 
                  className="text-lg font-medium hover:text-primary transition-colors"
                  onClick={() => setIsOpen(false)}
                  data-testid="mobile-nav-sell"
                >
                  Sell
                </Link>
                <Link 
                  href="/profile" 
                  className="text-lg font-medium hover:text-primary transition-colors"
                  onClick={() => setIsOpen(false)}
                  data-testid="mobile-nav-about"
                >
                  About
                </Link>
                <div className="border-t pt-4">
                  <Link 
                    href="/cart" 
                    className="flex items-center space-x-2 text-lg font-medium hover:text-primary transition-colors"
                    onClick={() => setIsOpen(false)}
                    data-testid="mobile-nav-cart"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Cart{cartCount > 0 ? ` (${cartCount})` : ''}</span>
                  </Link>
                  <div className="flex items-center space-x-2 text-lg font-medium hover:text-primary transition-colors mt-2 cursor-pointer">
                    <Heart className="h-5 w-5" />
                    <span>Wishlist{wishlistCount > 0 ? ` (${wishlistCount})` : ''}</span>
                  </div>
                </div>
                
                <div className="border-t pt-4 space-y-2">
                  {isAuthenticated ? (
                    <>
                      <div className="text-sm text-muted-foreground">
                        Signed in as {user?.firstName} {user?.lastName}
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={handleLogout}
                        data-testid="mobile-logout-button"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => handleAuthModal("login")}
                        data-testid="mobile-login-button"
                      >
                        Sign In
                      </Button>
                      <Button 
                        className="w-full" 
                        onClick={() => handleAuthModal("register")}
                        data-testid="mobile-register-button"
                      >
                        Sign Up
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />
    </header>
  );
}
