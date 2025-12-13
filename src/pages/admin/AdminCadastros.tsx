import { Suspense, lazy } from "react";
import { Package, Ticket, Building2, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load components for tabs
const AdminProductsContent = lazy(() => import("./AdminProducts"));
const AdminCouponsContent = lazy(() => import("./AdminCoupons"));
const AdminBankAccountsContent = lazy(() => import("./AdminBankAccounts"));
const AdminPlansContent = lazy(() => import("./AdminPlans"));

const TabLoadingFallback = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export default function AdminCadastros() {
  return (
    <div className="w-full p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Cadastros</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Gerencie produtos, cupons, contas bancárias e planos
        </p>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="products" className="flex-1 min-w-[80px] gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60">
            <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 hidden sm:block" />
            <span>Produtos</span>
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex-1 min-w-[80px] gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60">
            <Ticket className="h-3.5 w-3.5 sm:h-4 sm:w-4 hidden sm:block" />
            <span>Cupons</span>
          </TabsTrigger>
          <TabsTrigger value="bank-accounts" className="flex-1 min-w-[80px] gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60">
            <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 hidden sm:block" />
            <span>Banco e Contas</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex-1 min-w-[80px] gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60">
            <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 hidden sm:block" />
            <span>Planos e Preços</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <Suspense fallback={<TabLoadingFallback />}>
            <AdminProductsContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="coupons" className="mt-4">
          <Suspense fallback={<TabLoadingFallback />}>
            <AdminCouponsContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="bank-accounts" className="mt-4">
          <Suspense fallback={<TabLoadingFallback />}>
            <AdminBankAccountsContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="plans" className="mt-4">
          <Suspense fallback={<TabLoadingFallback />}>
            <AdminPlansContent />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
