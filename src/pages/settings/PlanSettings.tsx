import { PlanContent } from "@/components/settings/PlanContent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

const PlanSettings = () => {
  const isMobile = useIsMobile();

  return (
    <div className={`h-full ${isMobile ? '-mr-3' : '-mr-6 md:-mr-8'}`}>
      <ScrollArea className="h-full">
        <div className={`pb-4 sm:pb-6 md:pb-8 p-4 sm:p-6 ${isMobile ? 'pr-3' : 'pr-6 md:pr-8'}`}>
          <PlanContent />
        </div>
      </ScrollArea>
    </div>
  );
};

export default PlanSettings;
