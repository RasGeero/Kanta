import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface RouteProtectionProps {
  children: React.ReactNode;
  requiredRole?: 'seller' | 'admin' | 'buyer';
  fallbackPath?: string;
}

export function RouteProtection({ 
  children, 
  requiredRole, 
  fallbackPath = "/" 
}: RouteProtectionProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Don't redirect while still loading authentication state
    if (isLoading) return;

    // If not authenticated and authentication is required (either with specific role or just auth), redirect
    if (!isAuthenticated) {
      setLocation(fallbackPath);
      return;
    }

    // If authenticated but doesn't have required role, redirect
    if (isAuthenticated && requiredRole && user?.role !== requiredRole) {
      setLocation(fallbackPath);
      return;
    }
  }, [isAuthenticated, user?.role, requiredRole, isLoading, setLocation, fallbackPath]);

  // Show loading or nothing while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render children
  if (!isAuthenticated) {
    return null;
  }

  // If user doesn't have required role, don't render children
  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}

export function SellerRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteProtection requiredRole="seller" fallbackPath="/">
      {children}
    </RouteProtection>
  );
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteProtection requiredRole="admin" fallbackPath="/">
      {children}
    </RouteProtection>
  );
}

export function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteProtection fallbackPath="/">
      {children}
    </RouteProtection>
  );
}