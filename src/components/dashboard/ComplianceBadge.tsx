import { Shield, AlertTriangle, Clock, HelpCircle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

interface ComplianceBadgeProps {
  insuranceExpiryDate: string | null;
  technicalExpiryDate: string | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

type ComplianceStatus = "valid" | "warning" | "expired" | "missing";

const ComplianceBadge = ({
  insuranceExpiryDate,
  technicalExpiryDate,
  size = "md",
  showLabel = false,
}: ComplianceBadgeProps) => {
  const getComplianceStatus = (): ComplianceStatus => {
    const today = new Date();
    const warningThreshold = 15;

    // Check if documents are missing
    if (!insuranceExpiryDate || !technicalExpiryDate) {
      return "missing";
    }

    const insuranceDate = parseISO(insuranceExpiryDate);
    const technicalDate = parseISO(technicalExpiryDate);
    const insuranceDays = differenceInDays(insuranceDate, today);
    const technicalDays = differenceInDays(technicalDate, today);

    // Check if any document is expired
    if (insuranceDays < 0 || technicalDays < 0) {
      return "expired";
    }

    // Check if any document expires soon
    if (insuranceDays <= warningThreshold || technicalDays <= warningThreshold) {
      return "warning";
    }

    return "valid";
  };

  const status = getComplianceStatus();

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const iconSize = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  const config = {
    valid: {
      bg: "bg-green-100 dark:bg-green-900/30",
      icon: Shield,
      iconColor: "text-green-600 dark:text-green-400",
      label: "Conforme",
      labelColor: "text-green-600 dark:text-green-400",
    },
    warning: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      icon: Clock,
      iconColor: "text-amber-600 dark:text-amber-400",
      label: "À renouveler",
      labelColor: "text-amber-600 dark:text-amber-400",
    },
    expired: {
      bg: "bg-destructive/10",
      icon: AlertTriangle,
      iconColor: "text-destructive",
      label: "Expiré",
      labelColor: "text-destructive",
    },
    missing: {
      bg: "bg-muted",
      icon: HelpCircle,
      iconColor: "text-muted-foreground",
      label: "Incomplet",
      labelColor: "text-muted-foreground",
    },
  };

  const { bg, icon: Icon, iconColor, label, labelColor } = config[status];

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`${sizeClasses[size]} rounded-full ${bg} flex items-center justify-center`}
        title={label}
      >
        <Icon className={`${iconSize[size]} ${iconColor}`} />
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${labelColor}`}>{label}</span>
      )}
    </div>
  );
};

export default ComplianceBadge;
