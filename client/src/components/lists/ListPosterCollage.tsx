import { cn } from "@/lib/utils";

interface ListPosterCollageProps {
  coverUrls?: string[];
  fallbackGradient?: string;
  className?: string;
  aspectRatio?: "portrait" | "square" | "landscape";
}

/**
 * Letterboxd-style poster collage: overlapping posters (up to 5) as a list thumbnail.
 * Uses first ~5 item covers; fallback gradient when empty.
 */
export function ListPosterCollage({
  coverUrls = [],
  fallbackGradient = "from-slate-700 to-slate-900",
  className,
  aspectRatio = "portrait",
}: ListPosterCollageProps) {
  const urls = coverUrls.filter(Boolean).slice(0, 5);
  const hasCovers = urls.length > 0;

  const aspectClass =
    aspectRatio === "portrait"
      ? "aspect-[2/3]"
      : aspectRatio === "square"
        ? "aspect-square"
        : "aspect-video";

  if (!hasCovers) {
    return (
      <div
        className={cn(
          "rounded-md bg-gradient-to-br overflow-hidden shrink-0",
          fallbackGradient,
          aspectClass,
          className
        )}
      />
    );
  }

  // Letterboxd-style: 4–5 posters in overlapping grid
  const positions: { left: string; top: string; width: string }[] = [
    { left: "0%", top: "0%", width: "55%" },
    { left: "35%", top: "0%", width: "55%" },
    { left: "70%", top: "0%", width: "55%" },
    { left: "17%", top: "45%", width: "55%" },
    { left: "52%", top: "45%", width: "55%" },
  ];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md shrink-0 bg-muted/30",
        aspectClass,
        className
      )}
    >
      {urls.map((url, i) => (
        <div
          key={`${url}-${i}`}
          className="absolute rounded overflow-hidden shadow-sm ring-1 ring-border/30"
          style={{
            left: positions[i]?.left ?? "0%",
            top: positions[i]?.top ?? "0%",
            width: positions[i]?.width ?? "50%",
            zIndex: i,
          }}
        >
          <img
            src={url}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
