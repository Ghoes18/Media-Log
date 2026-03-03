import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface TierItemProps {
  id: string;
  coverUrl: string;
  coverGradient: string;
  title?: string;
  className?: string;
  disabled?: boolean;
}

export function TierItem({ id, coverUrl, coverGradient, title, className, disabled = false }: TierItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
      title={title}
      className={cn(
        "group relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden touch-pan-y",
        "ring-2 ring-transparent hover:ring-primary/60 transition-all duration-150",
        disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-0",
        className,
      )}
    >
      {coverUrl ? (
        <img src={coverUrl} alt={title ?? ""} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className={cn("w-full h-full bg-gradient-to-br", coverGradient || "from-slate-700 to-slate-900")} />
      )}
      {/* Title overlay on hover */}
      {title && (
        <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
          <p className="text-[9px] leading-tight text-white truncate text-center font-medium">{title}</p>
        </div>
      )}
    </div>
  );
}
