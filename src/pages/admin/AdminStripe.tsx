import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, CreditCard } from "lucide-react";
const AdminStripeEventsContent = lazy(() => import("@/components/admin/AdminStripeEventsContent"));
const AdminPaymentsContent = lazy(() => import("@/components/admin/AdminPaymentsContent"));
const TabLoadingFallback = () => <div className="space-y-4">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>;
export default function AdminStripe() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "events";
  const handleTabChange = (value: string) => {
    setSearchParams({
      tab: value
    });
  };
  return <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-3xl font-bold">Stripe</h1>
        <p className="text-muted-foreground">Gerenciamento de eventos e pagamentos do Stripe dos Afiliados</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl w-full sm:w-auto sm:inline-grid">
          <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-background data-[state=inactive]:border data-[state=inactive]:border-border rounded-lg">
            <CreditCard className="w-4 h-4 mr-2" />
            <span>Pagamentos de Afiliados</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-background data-[state=inactive]:border data-[state=inactive]:border-border rounded-lg">
            <Zap className="w-4 h-4 mr-2" />
            <span>Eventos de Afiliados</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" forceMount className="data-[state=inactive]:hidden mt-6">
          <Suspense fallback={<TabLoadingFallback />}>
            <AdminPaymentsContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="events" forceMount className="data-[state=inactive]:hidden mt-6">
          <Suspense fallback={<TabLoadingFallback />}>
            <AdminStripeEventsContent />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>;
}