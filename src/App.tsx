import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import LandingPage from "./pages/LandingPage";
import LandingTestimonials from "./pages/LandingTestimonials";
import SignupFunnel from "./pages/SignupFunnel";
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
import AdminLandingPage from "./pages/admin/AdminLandingPage";
import AdminStripeEvents from "./pages/admin/AdminStripeEvents";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminBankAccounts from "./pages/admin/AdminBankAccounts";
import AdminCpfApis from "./pages/admin/AdminCpfApis";
import AdminLegalDocuments from "./pages/admin/AdminLegalDocuments";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminAffiliates from "./pages/admin/AdminAffiliates";
import AdminCommissionLevels from "./pages/admin/AdminCommissionLevels";
import Payments from "./pages/Payments";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiesPolicy from "./pages/CookiesPolicy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos - mantém dados frescos por esse tempo
      refetchOnWindowFocus: false, // Não refazer query ao focar janela
      retry: 1, // Tentar apenas 1 vez em caso de erro
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingTestimonials />} />
            <Route path="/signup/:planId" element={<SignupFunnel />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiesPolicy />} />
            
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
              <Route path="/payments" element={<Payments />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/google-business" element={<GoogleBusiness />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/affiliates" element={<AdminAffiliates />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/landing-page" element={<AdminLandingPage />} />
              <Route path="/admin/stripe-events" element={<AdminStripeEvents />} />
              <Route path="/admin/coupons" element={<AdminCoupons />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/bank-accounts" element={<AdminBankAccounts />} />
              <Route path="/admin/cpf-apis" element={<AdminCpfApis />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route path="/admin/commission-levels" element={<AdminCommissionLevels />} />
              <Route path="/admin/legal-documents" element={<AdminLegalDocuments />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
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
