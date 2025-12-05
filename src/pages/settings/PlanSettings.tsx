import { PlanContent } from "@/components/settings/PlanContent";
import { ScrollArea } from "@/components/ui/scroll-area";

const PlanSettings = () => {
  return (
    <div className="h-full">
      <ScrollArea className="h-full">
        <div className="p-4 sm:p-6">
          <PlanContent />
        </div>
      </ScrollArea>
    </div>
  );
};

export default PlanSettings;
