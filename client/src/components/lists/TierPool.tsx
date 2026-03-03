import { useDroppable } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { TierItem } from "./TierItem";
import type { TierItemWithDetails } from "./TierRow";
import { cn } from "@/lib/utils";

interface TierPoolProps {
  id: string;
  items: TierItemWithDetails[];
  canDrag: boolean;
}

export function TierPool({ id, items, canDrag }: TierPoolProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const itemIds = items.map((i) => i.id);

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 pl-1">
        Unranked
      </p>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[5.5rem] rounded-xl border-2 border-dashed p-2.5 transition-all duration-150",
          isOver
            ? "border-primary/60 bg-primary/5 shadow-md shadow-primary/10"
            : "border-border/40 bg-muted/10 hover:border-border/60",
        )}
      >
        <div className="flex flex-wrap gap-2 items-center">
          <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
            {items.map((item) => (
              <TierItem
                key={item.id}
                id={item.id}
                coverUrl={item.media.coverUrl}
                coverGradient={item.media.coverGradient}
                title={item.media.title}
                disabled={!canDrag}
              />
            ))}
          </SortableContext>

          {items.length === 0 && (
            <p className="text-xs text-muted-foreground/40 italic select-none w-full text-center py-3">
              {isOver ? "Release to unrank" : "Items not yet placed will appear here"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
