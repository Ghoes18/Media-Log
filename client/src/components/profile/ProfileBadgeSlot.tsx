import { Award, Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type BadgeData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl?: string | null;
  rarity: string;
  earnedAt?: Date;
};

interface ProfileBadgeSlotProps {
  badge?: BadgeData | null;
  isEmpty?: boolean;
  isLocked?: boolean;
  className?: string;
}

export function ProfileBadgeSlot({
  badge,
  isEmpty,
  isLocked,
  className,
}: ProfileBadgeSlotProps) {
  const rarityColors: Record<string, string> = {
    common: "border-muted-foreground/30 bg-muted/50",
    rare: "border-blue-500/40 bg-blue-500/10",
    epic: "border-purple-500/40 bg-purple-500/10",
    legendary: "border-amber-500/50 bg-amber-500/20",
  };
  const slotStyle = badge ? rarityColors[badge.rarity] ?? rarityColors.common : "border-muted bg-muted/30";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              slotStyle,
              isEmpty && "opacity-60",
              className
            )}
            role="img"
            aria-label={badge ? badge.name : isLocked ? "Pro feature" : "Earn badges by using the app"}
          >
            {badge ? (
              badge.iconUrl ? (
                <img
                  src={badge.iconUrl}
                  alt={badge.name}
                  className="h-6 w-6 object-contain"
                />
              ) : (
                <Award className="h-5 w-5 text-muted-foreground" />
              )
            ) : isLocked ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Award className="h-5 w-5 text-muted-foreground/50" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {badge ? (
            <>
              <p className="font-medium">{badge.name}</p>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
            </>
          ) : isLocked ? (
            <p>Upgrade to Pro to unlock badge customization</p>
          ) : (
            <p>Earn badges by using the app</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
