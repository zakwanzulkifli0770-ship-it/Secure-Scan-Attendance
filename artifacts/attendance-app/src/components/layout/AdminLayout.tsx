import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, QrCode, Users, CalendarDays, FileText, LogOut } from "lucide-react";
import { setToken } from "@/lib/auth";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    setToken(null);
    setLocation("/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "QR Code", href: "/admin/qr", icon: QrCode },
    { label: "Attendance", href: "/admin/attendance", icon: CalendarDays },
    { label: "Employees", href: "/admin/employees", icon: Users },
    { label: "Reports", href: "/admin/reports", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-sidebar border-r flex flex-col hidden md:flex">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-sidebar-foreground">HR Portal</h2>
          <p className="text-sm text-sidebar-foreground/60 mt-1">Attendance System</p>
        </div>
        <nav className="flex-1 px-4 py-2 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                  location === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      <div className="md:hidden bg-sidebar p-4 border-b flex items-center justify-between">
        <h2 className="text-xl font-bold text-sidebar-foreground">HR Portal</h2>
        <button onClick={handleLogout} className="text-sidebar-foreground">
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
