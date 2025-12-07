import { DollarSign, Users, Network } from "lucide-react";
import { Reference, ReferenceType } from "./ReferenceSelector";

interface ReferenceDisplayProps {
  references: Reference[];
  isOwnMessage: boolean;
  onReferenceClick: (reference: Reference) => void;
}

const referenceConfig: Record<ReferenceType, {
  icon: typeof DollarSign;
  bgClass: string;
  borderClass: string;
  textClass: string;
  iconClass: string;
}> = {
  commission: {
    icon: DollarSign,
    bgClass: "bg-emerald-100 dark:bg-emerald-900/30",
    borderClass: "border-emerald-300 dark:border-emerald-700",
    textClass: "text-emerald-800 dark:text-emerald-200",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  referral: {
    icon: Users,
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
    borderClass: "border-blue-300 dark:border-blue-700",
    textClass: "text-blue-800 dark:text-blue-200",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  sub_affiliate: {
    icon: Network,
    bgClass: "bg-purple-100 dark:bg-purple-900/30",
    borderClass: "border-purple-300 dark:border-purple-700",
    textClass: "text-purple-800 dark:text-purple-200",
    iconClass: "text-purple-600 dark:text-purple-400",
  },
};

const typeLabels: Record<ReferenceType, string> = {
  commission: "Comissão",
  referral: "Indicação",
  sub_affiliate: "Sub-afiliado",
};

export function ReferenceDisplay({ references, isOwnMessage, onReferenceClick }: ReferenceDisplayProps) {
  if (!references || references.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mb-2">
      {references.map((ref, index) => {
        const config = referenceConfig[ref.type];
        const Icon = config.icon;

        return (
          <button
            key={`${ref.id}-${index}`}
            onClick={() => onReferenceClick(ref)}
            className={`
              flex items-start gap-2 p-2 rounded-lg border transition-all
              hover:opacity-80 hover:shadow-sm cursor-pointer text-left
              ${config.bgClass} ${config.borderClass}
            `}
          >
            <div className={`p-1 rounded ${config.bgClass}`}>
              <Icon className={`w-4 h-4 ${config.iconClass}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${config.textClass}`}>
                {typeLabels[ref.type]}
              </p>
              <p className={`text-sm font-medium truncate ${config.textClass}`}>
                {ref.label}
              </p>
              {ref.details && (
                <p className={`text-xs opacity-75 truncate ${config.textClass}`}>
                  {ref.details}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
