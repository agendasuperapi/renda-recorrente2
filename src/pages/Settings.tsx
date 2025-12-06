import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalProfileContent } from "@/components/settings/PersonalProfileContent";
import { PlanContent } from "@/components/settings/PlanContent";
import { SecurityContent } from "@/components/settings/SecurityContent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Crown, Shield } from "lucide-react";

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "personal";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 pt-4 sm:pt-6">
        <h1 className="text-2xl font-bold mb-4">Configurações</h1>
        <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full flex gap-2 bg-transparent p-0 mb-4">
            <TabsTrigger 
              value="personal" 
              className="flex-1 flex items-center justify-center gap-2 rounded-full border border-border/50 bg-card/20 px-4 py-2.5 text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-background data-[state=active]:shadow-lg"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Meu Perfil</span>
              <span className="sm:hidden">Perfil</span>
            </TabsTrigger>
            <TabsTrigger 
              value="plan" 
              className="flex-1 flex items-center justify-center gap-2 rounded-full border border-border/50 bg-card/20 px-4 py-2.5 text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-background data-[state=active]:shadow-lg"
            >
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Meu Plano</span>
              <span className="sm:hidden">Plano</span>
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="flex-1 flex items-center justify-center gap-2 rounded-full border border-border/50 bg-card/20 px-4 py-2.5 text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-background data-[state=active]:shadow-lg"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Conta</span>
              <span className="sm:hidden">Conta</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <PersonalProfileContent />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="plan" className="mt-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <PlanContent />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <SecurityContent />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
