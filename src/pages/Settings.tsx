import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileContent } from "@/components/settings/ProfileContent";
import { PlanContent } from "@/components/settings/PlanContent";
import { useSearchParams } from "react-router-dom";

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "profile";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie seu perfil e plano de assinatura
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="plan">Plano</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-6">
          <ProfileContent />
        </TabsContent>
        
        <TabsContent value="plan" className="mt-6">
          <PlanContent />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
