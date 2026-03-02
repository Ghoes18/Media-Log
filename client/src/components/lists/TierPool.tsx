import { useDroppable } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { TierItem } from "./TierItem";
import type { TierItemWithDetails } from "./TierRow";
import { cn } from "@/lib/utils";

interface TierPoolProps {
  id: string;
  items: TierItemWithDetails[];
}

export function TierPool({ id, items }: TierPoolProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const itemIds = items.map((i) => i.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[5rem] rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-2 transition-colors",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="w-14 sm:w-20 shrink-0 flex items-center justify-center text-muted-foreground text-sm font-medium">
        Pool
      </div>
      <div className="flex-1 flex flex-wrap gap-2 items-center min-w-0">
        <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
          {items.map((item) => (
            <TierItem
              key={item.id}
              id={item.id}
              coverUrl={item.media.coverUrl}
              coverGradient={item.media.coverGradient}
              title={item.media.title}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
