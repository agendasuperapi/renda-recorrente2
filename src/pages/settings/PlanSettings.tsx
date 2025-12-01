import { PlanContent } from "@/components/settings/PlanContent";

const PlanSettings = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Plano</h1>
        <p className="text-muted-foreground">
          Gerencie sua assinatura e plano
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <PlanContent />
      </div>
    </div>
  );
};

export default PlanSettings;
