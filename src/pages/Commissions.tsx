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
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger 
            value="daily" 
            className="group relative flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2"
          >
            <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Diárias</span>
            <span className="sm:hidden">Diárias</span>
            <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-primary opacity-0 transition-opacity group-data-[state=active]:opacity-100" />
          </TabsTrigger>
          <TabsTrigger 
            value="monthly" 
            className="group relative flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2"
          >
            <CalendarRange className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Mensais</span>
            <span className="sm:hidden">Mensais</span>
            <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-primary opacity-0 transition-opacity group-data-[state=active]:opacity-100" />
          </TabsTrigger>
          <TabsTrigger 
            value="withdrawals" 
            className="group relative flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2"
          >
            <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Saques</span>
            <span className="sm:hidden">Saques</span>
            <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-primary opacity-0 transition-opacity group-data-[state=active]:opacity-100" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-6">
          <CommissionsDailyContent />
        </TabsContent>
        <TabsContent value="monthly" className="mt-6">
          <CommissionsMonthlyContent />
        </TabsContent>
        <TabsContent value="withdrawals" className="mt-6">
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
