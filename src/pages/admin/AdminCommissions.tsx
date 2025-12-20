import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, CreditCard, Wallet } from "lucide-react";
import { AdminCommissionsTab } from "@/components/admin/AdminCommissionsTab";
import { AdminCommissionProcessingTab } from "@/components/admin/AdminCommissionProcessingTab";
import { AdminWithdrawalsTab } from "@/components/admin/AdminWithdrawalsTab";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { EnvironmentToggle } from "@/components/layout/EnvironmentToggle";

const AdminCommissions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "commissions");
  const { environment } = useEnvironment();

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Comissões</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie comissões de todos os afiliados
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <EnvironmentToggle />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-3 gap-2 bg-muted/50 p-1.5 rounded-xl h-auto">
          <TabsTrigger
            value="commissions"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-background data-[state=inactive]:border data-[state=inactive]:border-border gap-2 py-2.5"
          >
            <Coins className="h-4 w-4" />
            <span>Comissões</span>
          </TabsTrigger>
          <TabsTrigger
            value="withdrawals"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-background data-[state=inactive]:border data-[state=inactive]:border-border gap-2 py-2.5"
          >
            <Wallet className="h-4 w-4" />
            <span>Saques</span>
          </TabsTrigger>
          <TabsTrigger
            value="processing"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-background data-[state=inactive]:border data-[state=inactive]:border-border gap-2 py-2.5"
          >
            <CreditCard className="h-4 w-4" />
            <span>Pagamentos Recebidos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commissions" forceMount className="data-[state=inactive]:hidden mt-6">
          <AdminCommissionsTab />
        </TabsContent>

        <TabsContent value="withdrawals" forceMount className="data-[state=inactive]:hidden mt-6">
          <AdminWithdrawalsTab />
        </TabsContent>

        <TabsContent value="processing" forceMount className="data-[state=inactive]:hidden mt-6">
          <AdminCommissionProcessingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCommissions;
