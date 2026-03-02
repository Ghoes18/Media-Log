import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface TierItemProps {
  id: string;
  coverUrl: string;
  coverGradient: string;
  title?: string;
  className?: string;
}

export function TierItem({ id, coverUrl, coverGradient, title, className }: TierItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing touch-none",
        "ring-2 ring-transparent hover:ring-primary/50 transition-all",
        isDragging && "opacity-80 scale-105 z-50 ring-primary shadow-lg",
        className,
      )}
    >
      {coverUrl ? (
        <img src={coverUrl} alt={title ?? ""} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className={cn("w-full h-full bg-gradient-to-br", coverGradient || "from-slate-700 to-slate-900")} />
      )}
    </div>
  );
}
