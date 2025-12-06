import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, CalendarRange, Wallet, Target, Eye, EyeOff } from "lucide-react";
import CommissionsDaily from "./CommissionsDaily";
import CommissionsMonthly from "./CommissionsMonthly";
import Withdrawals from "./Withdrawals";
import GoalsTab from "@/components/goals/GoalsTab";
import { ScrollAnimation } from "@/components/ScrollAnimation";
import { Button } from "@/components/ui/button";

const Commissions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "daily";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showValues, setShowValues] = useState(true);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <ScrollAnimation animation="fade-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Comissões</h1>
            <p className="text-muted-foreground">
              Gerencie suas comissões e saques
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowValues(!showValues)}
            className="h-9 w-9 rounded-full bg-background hover:bg-muted border border-border shadow-md transition-all duration-200"
            title={showValues ? "Ocultar valores" : "Mostrar valores"}
          >
            {showValues ? (
              <Eye className="h-5 w-5 text-foreground" />
            ) : (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </div>
      </ScrollAnimation>

      <ScrollAnimation animation="fade-up" delay={100}>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-4 gap-2 bg-muted/50 p-1.5 rounded-xl mb-4">
            <TabsTrigger 
              value="daily" 
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Diárias</span>
            </TabsTrigger>
            <TabsTrigger 
              value="monthly" 
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60"
            >
              <CalendarRange className="h-4 w-4" />
              <span className="hidden sm:inline">Mensais</span>
            </TabsTrigger>
            <TabsTrigger 
              value="withdrawals" 
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60"
            >
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Saques</span>
            </TabsTrigger>
            <TabsTrigger 
              value="goals" 
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/60"
            >
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Metas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent 
            value="daily" 
            forceMount 
            className="mt-6 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150"
          >
            <CommissionsDaily embedded showValues={showValues} />
          </TabsContent>
          <TabsContent 
            value="monthly" 
            forceMount 
            className="mt-6 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150"
          >
            <CommissionsMonthly embedded showValues={showValues} />
          </TabsContent>
          <TabsContent 
            value="withdrawals" 
            forceMount 
            className="mt-6 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150"
          >
            <Withdrawals embedded showValues={showValues} />
          </TabsContent>
          <TabsContent 
            value="goals" 
            forceMount 
            className="mt-6 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150"
          >
            <GoalsTab embedded showValues={showValues} />
          </TabsContent>
        </Tabs>
      </ScrollAnimation>
    </div>
  );
};

export default Commissions;
