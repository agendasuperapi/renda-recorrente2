import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { EnvironmentProvider } from "@/contexts/EnvironmentContext";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { useStatusBarColor } from "@/hooks/useStatusBarColor";
import LandingPage from "./pages/LandingPage";
import LandingTestimonials from "./pages/LandingTestimonials";
import SignupFunnel from "./pages/SignupFunnel";
import Auth from "./pages/Auth";
import PasswordRecovery from "./pages/PasswordRecovery";
import Checkout from "./pages/Checkout";
import CheckoutReturn from "./pages/CheckoutReturn";
import Dashboard from "./pages/Dashboard";
import Performance from "./pages/Performance";
import Profile from "./pages/Profile";
import Training from "./pages/Training";
import Referrals from "./pages/Referrals";
import SubAffiliates from "./pages/SubAffiliates";
import Commissions from "./pages/Commissions";
import Activities from "./pages/Activities";
import Coupons from "./pages/Coupons";
import Plan from "./pages/Plan";
import GoogleBusiness from "./pages/GoogleBusiness";
import Settings from "./pages/Settings";
import ProfileSettings from "./pages/settings/ProfileSettings";
import PersonalProfileSettings from "./pages/settings/PersonalProfileSettings";
import PlanSettings from "./pages/settings/PlanSettings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminLandingPage from "./pages/admin/AdminLandingPage";
import AdminStripe from "./pages/admin/AdminStripe";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminBankAccounts from "./pages/admin/AdminBankAccounts";
import AdminCpfApis from "./pages/admin/AdminCpfApis";
import AdminLegalDocuments from "./pages/admin/AdminLegalDocuments";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminVersions from "./pages/admin/AdminVersions";
import AdminAffiliates from "./pages/admin/AdminAffiliates";
import AdminCadastros from "./pages/admin/AdminCadastros";
import AdminCommissionLevels from "./pages/admin/AdminCommissionLevels";

import AdminSupport from "./pages/admin/AdminSupport";

import AdminCommissions from "./pages/admin/AdminCommissions";
import AdminCommissionProcessing from "./pages/admin/AdminCommissionProcessing";
import Payments from "./pages/Payments";
import Support from "./pages/Support";
import Notifications from "./pages/Notifications";
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

const App = () => {
  // Forçar cor da barra de status para #10b981
  useStatusBarColor();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <EnvironmentProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
          <Routes>
            {/* Rotas públicas sem prefixo */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingTestimonials />} />
            <Route path="/signup/:planId" element={<SignupFunnel />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/recovery" element={<PasswordRecovery />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/return" element={<CheckoutReturn />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiesPolicy />} />
            
            {/* Rotas de usuário autenticado com prefixo /user */}
            <Route element={<DashboardLayout />}>
              <Route path="/user/dashboard" element={<Dashboard />} />
              <Route path="/user/performance" element={<Performance />} />
              <Route path="/user/profile" element={<Profile />} />
              <Route path="/user/training" element={<Training />} />
              <Route path="/user/referrals" element={<Referrals />} />
              <Route path="/user/sub-affiliates" element={<SubAffiliates />} />
              <Route path="/user/commissions" element={<Commissions />} />
              <Route path="/user/commissions-daily" element={<Navigate to="/user/commissions?tab=daily" replace />} />
              <Route path="/user/commissions-monthly" element={<Navigate to="/user/commissions?tab=monthly" replace />} />
              <Route path="/user/withdrawals" element={<Navigate to="/user/commissions?tab=withdrawals" replace />} />
              <Route path="/user/activities" element={<Activities />} />
              <Route path="/user/coupons" element={<Coupons />} />
              <Route path="/user/payments" element={<Payments />} />
              <Route path="/user/support" element={<Support />} />
              <Route path="/user/notifications" element={<Notifications />} />
              <Route path="/user/plan" element={<Plan />} />
              <Route path="/user/google-business" element={<GoogleBusiness />} />
              <Route path="/user/settings" element={<Settings />} />
              <Route path="/user/settings/profile" element={<ProfileSettings />} />
              <Route path="/user/settings/personal" element={<Navigate to="/user/settings?tab=personal" replace />} />
              <Route path="/user/settings/plan" element={<Navigate to="/user/settings?tab=plan" replace />} />
              
              {/* Rotas admin (mantém prefixo /admin) */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/affiliates" element={<AdminAffiliates />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/landing-page" element={<AdminLandingPage />} />
              <Route path="/admin/stripe" element={<AdminStripe />} />
              <Route path="/admin/stripe-events" element={<Navigate to="/admin/stripe?tab=events" replace />} />
              <Route path="/admin/payments" element={<Navigate to="/admin/stripe?tab=payments" replace />} />
              <Route path="/admin/coupons" element={<AdminCoupons />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/bank-accounts" element={<AdminBankAccounts />} />
              <Route path="/admin/cpf-apis" element={<AdminCpfApis />} />
              <Route path="/admin/withdrawals" element={<Navigate to="/admin/commissions?tab=withdrawals" replace />} />
              <Route path="/admin/commission-levels" element={<AdminCommissionLevels />} />
              <Route path="/admin/legal-documents" element={<AdminLegalDocuments />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/versions" element={<AdminVersions />} />
              <Route path="/admin/cadastros" element={<AdminCadastros />} />
              <Route path="/admin/support" element={<AdminSupport />} />
              <Route path="/admin/notifications" element={<Notifications />} />
              <Route path="/admin/activities" element={<Navigate to="/admin/settings?tab=activities" replace />} />
              <Route path="/admin/commissions" element={<AdminCommissions />} />
              <Route path="/admin/commission-processing" element={<Navigate to="/admin/commissions?tab=processing" replace />} />
            </Route>
            
            {/* Catch-all - Intercepta cupons ou mostra 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </EnvironmentProvider>
  </ThemeProvider>
</QueryClientProvider>
  );
};

export default App;
