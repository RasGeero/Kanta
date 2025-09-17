import { useState } from "react";
import { Link } from "wouter";
import { ShoppingBag, Heart, ShoppingCart, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function NavigationHeader() {
  const [isOpen, setIsOpen] = useState(false);

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
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                data-testid="wishlist-button"
              >
                <Heart className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  3
                </span>
              </Button>
              <Link href="/cart">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  data-testid="cart-button"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    2
                  </span>
                </Button>
              </Link>
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
                    <span>Cart (2)</span>
                  </Link>
                  <div className="flex items-center space-x-2 text-lg font-medium hover:text-primary transition-colors mt-2 cursor-pointer">
                    <Heart className="h-5 w-5" />
                    <span>Wishlist (3)</span>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
