import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { getToken } from "@/lib/auth";
import { Spinner } from "@/components/ui/spinner";

export function AuthGuard({ children, requireRole }: { children: React.ReactNode, requireRole?: "admin" | "employee" }) {
  const [, setLocation] = useLocation();
  const token = getToken();

  // If no token at all, redirect immediately
  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
  }, [token, setLocation]);

  const { data: user, isLoading, error } = useGetMe({ 
    query: { 
      enabled: !!token, 
      retry: false
    } 
  });

  useEffect(() => {
    if (error) {
      setLocation("/login");
    }
  }, [error, setLocation]);

  useEffect(() => {
    if (user && requireRole && user.role !== requireRole) {
      // User is logged in but doesn't have the right role
      setLocation(user.role === "admin" ? "/admin" : "/");
    }
  }, [user, requireRole, setLocation]);

  if (!token) return null;
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!user || (requireRole && user.role !== requireRole)) return null;

  return <>{children}</>;
}
