import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

// Pages
import Login from "@/pages/Login";
import EmployeeHome from "@/pages/employee/Home";
import EmployeeScan from "@/pages/employee/Scan";
import EmployeeHistory from "@/pages/employee/History";

import AdminDashboard from "@/pages/admin/Dashboard";
import AdminQrCode from "@/pages/admin/QrCode";
import AdminAttendance from "@/pages/admin/Attendance";
import AdminEmployees from "@/pages/admin/Employees";
import AdminReports from "@/pages/admin/Reports";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />

      {/* Admin Routes */}
      <Route path="/admin">
        <AuthGuard requireRole="admin">
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </AuthGuard>
      </Route>
      <Route path="/admin/qr">
        <AuthGuard requireRole="admin">
          <AdminLayout>
            <AdminQrCode />
          </AdminLayout>
        </AuthGuard>
      </Route>
      <Route path="/admin/attendance">
        <AuthGuard requireRole="admin">
          <AdminLayout>
            <AdminAttendance />
          </AdminLayout>
        </AuthGuard>
      </Route>
      <Route path="/admin/employees">
        <AuthGuard requireRole="admin">
          <AdminLayout>
            <AdminEmployees />
          </AdminLayout>
        </AuthGuard>
      </Route>
      <Route path="/admin/reports">
        <AuthGuard requireRole="admin">
          <AdminLayout>
            <AdminReports />
          </AdminLayout>
        </AuthGuard>
      </Route>

      {/* Employee Routes */}
      <Route path="/">
        <AuthGuard requireRole="employee">
          <MobileLayout>
            <EmployeeHome />
          </MobileLayout>
        </AuthGuard>
      </Route>
      <Route path="/scan">
        <AuthGuard requireRole="employee">
          <EmployeeScan />
        </AuthGuard>
      </Route>
      <Route path="/history">
        <AuthGuard requireRole="employee">
          <MobileLayout>
            <EmployeeHistory />
          </MobileLayout>
        </AuthGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
