import { cn } from "@/lib/utils";

interface ListPosterCollageProps {
  coverUrls?: string[];
  fallbackGradient?: string;
  className?: string;
  aspectRatio?: "portrait" | "square" | "landscape";
}

/**
 * Mosaic poster collage: up to 5 media images arranged as a tiled banner.
 * Layouts adapt to image count for maximum visual impact.
 */
export function ListPosterCollage({
  coverUrls = [],
  fallbackGradient = "from-slate-700 to-slate-900",
  className,
  aspectRatio = "portrait",
}: ListPosterCollageProps) {
  const urls = coverUrls.filter(Boolean).slice(0, 5);

  const aspectClass =
    aspectRatio === "portrait"
      ? "aspect-[2/3]"
      : aspectRatio === "square"
        ? "aspect-square"
        : "aspect-video";

  const base = cn("overflow-hidden shrink-0", aspectClass, className);

  if (urls.length === 0) {
    return <div className={cn(base, "bg-gradient-to-br", fallbackGradient)} />;
  }

  const n = urls.length;

  const Tile = ({ url, cls }: { url: string; cls?: string }) => (
    <div className={cn("overflow-hidden", cls)}>
      <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
    </div>
  );

  // 1 image — full bleed
  if (n === 1) {
    return (
      <div className={base}>
        <img src={urls[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  // 2 images — equal side-by-side columns
  if (n === 2) {
    return (
      <div className={cn(base, "flex gap-px")}>
        <Tile url={urls[0]} cls="flex-1" />
        <Tile url={urls[1]} cls="flex-1" />
      </div>
    );
  }

  // 3 images — wide left + two stacked right
  if (n === 3) {
    return (
      <div className={cn(base, "flex gap-px")}>
        <Tile url={urls[0]} cls="flex-[3]" />
        <div className="flex flex-[2] flex-col gap-px">
          <Tile url={urls[1]} cls="flex-1" />
          <Tile url={urls[2]} cls="flex-1" />
        </div>
      </div>
    );
  }

  // 4 images — 2×2 grid
  if (n === 4) {
    return (
      <div className={cn(base, "grid grid-cols-2 grid-rows-2 gap-px")}>
        {urls.map((url, i) => (
          <Tile key={i} url={url} cls="h-full" />
        ))}
      </div>
    );
  }

  // 5 images — 2 top + 3 bottom
  return (
    <div className={cn(base, "flex flex-col gap-px")}>
      <div className="flex flex-[3] gap-px">
        <Tile url={urls[0]} cls="flex-1" />
        <Tile url={urls[1]} cls="flex-1" />
      </div>
      <div className="flex flex-[2] gap-px">
        <Tile url={urls[2]} cls="flex-1" />
        <Tile url={urls[3]} cls="flex-1" />
        <Tile url={urls[4]} cls="flex-1" />
      </div>
    </div>
  );
}
