import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, CalendarRange, Wallet } from "lucide-react";
import CommissionsDaily from "./CommissionsDaily";
import CommissionsMonthly from "./CommissionsMonthly";
import Withdrawals from "./Withdrawals";

const Commissions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "daily";
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Comissões</h1>
        <p className="text-muted-foreground">
          Gerencie suas comissões e saques
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full flex gap-2 bg-transparent p-0 mb-4">
          <TabsTrigger 
            value="daily" 
            className="relative flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-white data-[state=active]:shadow-md"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Diárias</span>
            <span className="sm:hidden">Diárias</span>
            <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary-foreground opacity-0 transition-opacity [[data-state=active]_&]:opacity-100" />
          </TabsTrigger>
          <TabsTrigger 
            value="monthly" 
            className="relative flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-white data-[state=active]:shadow-md"
          >
            <CalendarRange className="h-4 w-4" />
            <span className="hidden sm:inline">Mensais</span>
            <span className="sm:hidden">Mensais</span>
            <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary-foreground opacity-0 transition-opacity [[data-state=active]_&]:opacity-100" />
          </TabsTrigger>
          <TabsTrigger 
            value="withdrawals" 
            className="relative flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-muted-foreground transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-white data-[state=active]:shadow-md"
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Saques</span>
            <span className="sm:hidden">Saques</span>
            <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary-foreground opacity-0 transition-opacity [[data-state=active]_&]:opacity-100" />
          </TabsTrigger>
        </TabsList>

        <TabsContent 
          value="daily" 
          forceMount 
          className="mt-6 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150"
        >
          <CommissionsDailyContent />
        </TabsContent>
        <TabsContent 
          value="monthly" 
          forceMount 
          className="mt-6 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150"
        >
          <CommissionsMonthlyContent />
        </TabsContent>
        <TabsContent 
          value="withdrawals" 
          forceMount 
          className="mt-6 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150"
        >
          <WithdrawalsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Wrapper components that remove the header/padding from child components
const CommissionsDailyContent = () => {
  return <CommissionsDaily embedded />;
};

const CommissionsMonthlyContent = () => {
  return <CommissionsMonthly embedded />;
};

const WithdrawalsContent = () => {
  return <Withdrawals embedded />;
};

export default Commissions;
