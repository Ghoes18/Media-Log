import { Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PaywallBadgeProps {
  className?: string;
  children?: React.ReactNode;
  label?: string;
}

export function PaywallBadge({ className, children, label = "Upgrade to Pro to customize" }: PaywallBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400",
              className
            )}
            role="img"
            aria-label={label}
          >
            <Lock className="h-3 w-3" />
            Pro
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
