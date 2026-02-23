import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRatingSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hoverPreview, setHoverPreview] = useState<{ starIndex: number; isLeftHalf: boolean } | null>(null);

  const getRatingFromPosition = (starIndex: number, e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;
    return isLeftHalf ? starIndex + 0.5 : starIndex + 1;
  };

  const displayValue = hoverPreview !== null
    ? hoverPreview.isLeftHalf ? hoverPreview.starIndex + 0.5 : hoverPreview.starIndex + 1
    : value;

  const handleClick = (starIndex: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const rating = getRatingFromPosition(starIndex, e);
    onChange(Math.min(5, Math.max(0.5, rating)));
  };

  const handleMouseMove = (starIndex: number, e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverPreview({ starIndex, isLeftHalf: x < rect.width / 2 });
  };

  return (
    <div
      className="flex items-center gap-1"
      data-testid="star-rating-selector"
      onMouseLeave={() => setHoverPreview(null)}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const full = Math.floor(displayValue);
        const half = displayValue - full >= 0.5;
        const starValue = i + 1;
        const active = starValue <= full;
        const halfActive = !active && half && starValue === full + 1;
        return (
          <button
            key={i}
            type="button"
            onClick={(e) => handleClick(i, e)}
            onMouseEnter={(e) => handleMouseMove(i, e)}
            onMouseMove={(e) => handleMouseMove(i, e)}
            data-testid={`button-star-${i + 1}`}
            className="flex items-center justify-center p-0.5"
            title={`${halfActive ? starValue - 0.5 : starValue} star${(halfActive ? starValue - 0.5 : starValue) === 1 ? "" : "s"}`}
          >
            {halfActive ? (
              <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
                <Star
                  className="h-5 w-5 text-muted-foreground/35"
                  strokeWidth={2}
                />
                <span className="absolute inset-0 w-1/2 overflow-hidden">
                  <Star
                    className="h-5 w-5 min-w-[20px] fill-amber-500 text-amber-500"
                    strokeWidth={0}
                  />
                </span>
              </span>
            ) : (
              <Star
                className={cn(
                  "h-5 w-5 transition-colors",
                  active
                    ? "fill-amber-500 text-amber-500"
                    : "text-muted-foreground/35 hover:text-amber-500/50",
                )}
                strokeWidth={2}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
