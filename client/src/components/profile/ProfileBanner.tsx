import { cn } from "@/lib/utils";

interface ProfileBannerProps {
  bannerUrl?: string | null;
  bannerPosition?: string;
  className?: string;
}

export function ProfileBanner({ bannerUrl, bannerPosition = "center", className }: ProfileBannerProps) {
  const positionMap: Record<string, string> = {
    top: "object-top",
    center: "object-center",
    bottom: "object-bottom",
  };
  const objPos = positionMap[bannerPosition] ?? "object-center";

  return (
    <div
      className={cn(
        "relative aspect-[5/2] w-full overflow-hidden rounded-t-lg sm:rounded-t-xl",
        "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900",
        className
      )}
    >
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt=""
          className={cn("absolute inset-0 h-full w-full object-cover", objPos)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-slate-700 to-slate-900" />
      )}
      {/* Bottom gradient overlay for text readability */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/80 to-transparent"
        aria-hidden
      />
    </div>
  );
}
