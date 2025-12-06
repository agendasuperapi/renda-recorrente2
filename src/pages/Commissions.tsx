import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, CalendarRange, Wallet } from "lucide-react";
import CommissionsDaily from "./CommissionsDaily";
import CommissionsMonthly from "./CommissionsMonthly";
import Withdrawals from "./Withdrawals";
import { ScrollAnimation } from "@/components/ScrollAnimation";

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
      <ScrollAnimation animation="fade-up">
        <div>
          <h1 className="text-3xl font-bold mb-2">Comissões</h1>
          <p className="text-muted-foreground">
            Gerencie suas comissões e saques
          </p>
        </div>
      </ScrollAnimation>

      <ScrollAnimation animation="fade-up" delay={100}>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-3 gap-2 bg-muted/50 p-1.5 rounded-xl mb-4">
            <TabsTrigger 
              value="daily" 
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60"
            >
              <CalendarDays className="h-4 w-4" />
              <span>Diárias</span>
            </TabsTrigger>
            <TabsTrigger 
              value="monthly" 
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60"
            >
              <CalendarRange className="h-4 w-4" />
              <span>Mensais</span>
            </TabsTrigger>
            <TabsTrigger 
              value="withdrawals" 
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60"
            >
              <Wallet className="h-4 w-4" />
              <span>Saques</span>
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
      </ScrollAnimation>
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
