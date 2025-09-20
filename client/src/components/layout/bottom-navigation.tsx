import { Link, useLocation } from "wouter";
import { Home, Search, PlusCircle, ShoppingBag, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cartApi } from "@/services/api";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import type { CartItemWithProduct } from "@shared/schema";

interface NavItem {
  href: string;
  icon: React.ForwardRefExoticComponent<Omit<any, "ref"> & React.RefAttributes<SVGSVGElement>>;
  label: string;
  badge?: number;
}

export default function BottomNavigation() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Fetch cart items count
  const { data: cartItems = [] } = useQuery<CartItemWithProduct[]>({
    queryKey: ['/api/cart'],
    queryFn: () => cartApi.getUserCart(),
    enabled: isAuthenticated,
  });

  // Calculate cart count
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  // Define navigation items based on user role and authentication
  const getNavItems = (): NavItem[] => {
    const baseItems = [
      { href: "/", icon: Home, label: "Home" },
      { href: "/search", icon: Search, label: "Search" },
    ];

    // Add seller-specific or CTA item
    if (user?.role === 'seller') {
      baseItems.push({ href: "/seller-dashboard", icon: PlusCircle, label: "Sell" });
    }

    // Add cart and profile for authenticated users
    if (isAuthenticated) {
      const cartItem: NavItem = { href: "/cart", icon: ShoppingBag, label: "Cart" };
      if (cartCount > 0) {
        cartItem.badge = cartCount;
      }
      
      baseItems.push(
        cartItem,
        { href: "/profile", icon: User, label: "Profile" }
      );
    }

    return baseItems;
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden z-40">
      <div className={cn(
        "py-2 grid gap-1",
        navItems.length === 2 ? "grid-cols-2" :
        navItems.length === 3 ? "grid-cols-3" :
        navItems.length === 4 ? "grid-cols-4" :
        "grid-cols-5"
      )}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center py-2"
              data-testid={`bottom-nav-${item.label.toLowerCase()}`}
            >
              <div className="relative">
                <Icon 
                  className={cn(
                    "h-5 w-5 mb-1",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} 
                />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span 
                className={cn(
                  "text-xs",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
