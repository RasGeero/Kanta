import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { SellerRoute, AdminRoute, AuthenticatedRoute } from "@/components/auth/route-protection";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import About from "@/pages/about";
import ProductDetail from "@/pages/product-detail";
import SellerDashboard from "@/pages/seller-dashboard";
import AIStudio from "@/pages/ai-studio";
import AdminDashboard from "@/pages/admin-dashboard";
import Checkout from "@/pages/checkout";
import Search from "@/pages/search";
import Cart from "@/pages/cart";
import Profile from "@/pages/profile";
import NavigationHeader from "@/components/layout/navigation-header";
import BottomNavigation from "@/components/layout/bottom-navigation";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/search" component={Search} />
      
      {/* Protected Routes */}
      <Route path="/seller-dashboard">
        <SellerRoute>
          <SellerDashboard />
        </SellerRoute>
      </Route>
      
      <Route path="/ai-studio">
        <SellerRoute>
          <AIStudio />
        </SellerRoute>
      </Route>
      
      <Route path="/admin">
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      </Route>
      
      <Route path="/checkout">
        <AuthenticatedRoute>
          <Checkout />
        </AuthenticatedRoute>
      </Route>
      
      <Route path="/cart">
        <AuthenticatedRoute>
          <Cart />
        </AuthenticatedRoute>
      </Route>
      
      <Route path="/profile">
        <AuthenticatedRoute>
          <Profile />
        </AuthenticatedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background text-foreground">
            <NavigationHeader />
            <main className="pb-16 md:pb-0">
              <Router />
            </main>
            <BottomNavigation />
          </div>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
