import React from "react";
import { Link, useLocation } from "wouter";
import { Home, History, User } from "lucide-react";

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background pb-16 flex flex-col">
      <header className="bg-card border-b p-4 sticky top-0 z-10 shadow-xs">
        <h1 className="text-xl font-bold text-foreground">Attendance</h1>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col">
        {children}
      </main>

      <nav className="fixed bottom-0 w-full bg-card border-t flex justify-around items-center p-3 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <Link href="/">
          <div className={`flex flex-col items-center gap-1 ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium">Home</span>
          </div>
        </Link>
        <Link href="/history">
          <div className={`flex flex-col items-center gap-1 ${location === "/history" ? "text-primary" : "text-muted-foreground"}`}>
            <History className="w-6 h-6" />
            <span className="text-[10px] font-medium">History</span>
          </div>
        </Link>
        <div className="flex flex-col items-center gap-1 text-muted-foreground opacity-50">
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </div>
      </nav>
    </div>
  );
}
