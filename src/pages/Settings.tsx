import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileContent } from "@/components/settings/ProfileContent";
import { PlanContent } from "@/components/settings/PlanContent";
import { useSearchParams } from "react-router-dom";
import { User, Crown } from "lucide-react";
const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "profile";
  const handleTabChange = (value: string) => {
    setSearchParams({
      tab: value
    });
  };
  return <div className="space-y-6">
      

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="plan">
            <Crown className="mr-2 h-4 w-4" />
            Plano
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-6">
          <ProfileContent />
        </TabsContent>
        
        <TabsContent value="plan" className="mt-6">
          <PlanContent />
        </TabsContent>
      </Tabs>
    </div>;
};
export default Settings;