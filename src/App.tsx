import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Training from "./pages/Training";
import Referrals from "./pages/Referrals";
import SubAffiliates from "./pages/SubAffiliates";
import CommissionsDaily from "./pages/CommissionsDaily";
import CommissionsMonthly from "./pages/CommissionsMonthly";
import Activities from "./pages/Activities";
import Coupons from "./pages/Coupons";
import Withdrawals from "./pages/Withdrawals";
import Plan from "./pages/Plan";
import GoogleBusiness from "./pages/GoogleBusiness";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminSegments from "./pages/admin/AdminSegments";
import AdminStripeEvents from "./pages/admin/AdminStripeEvents";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminBankAccounts from "./pages/admin/AdminBankAccounts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Protected Routes with DashboardLayout */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/training" element={<Training />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/sub-affiliates" element={<SubAffiliates />} />
              <Route path="/commissions-daily" element={<CommissionsDaily />} />
              <Route path="/commissions-monthly" element={<CommissionsMonthly />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/coupons" element={<Coupons />} />
              <Route path="/withdrawals" element={<Withdrawals />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/google-business" element={<GoogleBusiness />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/segments" element={<AdminSegments />} />
              <Route path="/admin/stripe-events" element={<AdminStripeEvents />} />
              <Route path="/admin/coupons" element={<AdminCoupons />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/bank-accounts" element={<AdminBankAccounts />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
