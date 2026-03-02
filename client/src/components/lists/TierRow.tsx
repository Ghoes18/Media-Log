import { useDroppable } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Pencil, Trash2 } from "lucide-react";
import { TierItem } from "./TierItem";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TierItemWithDetails {
  id: string;
  tierListId: string;
  mediaId: string;
  tierId: string | null;
  position: number;
  media: { id: string; coverUrl: string; coverGradient: string; title?: string };
}

interface TierRowProps {
  tier: { id: string; label: string; color: string; position: number };
  items: TierItemWithDetails[];
  canEdit: boolean;
  onEditTier?: () => void;
  onDeleteTier?: () => void;
}

export function TierRow({ tier, items, canEdit, onEditTier, onDeleteTier }: TierRowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: tier.id });
  const itemIds = items.map((i) => i.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[5rem] rounded-lg border-2 border-dashed transition-colors",
        isOver && "bg-background/50 border-solid",
      )}
    >
      <div
        className="w-14 sm:w-20 shrink-0 flex flex-col items-center justify-center rounded-l-lg font-bold text-lg sm:text-xl text-white"
        style={{ backgroundColor: tier.color }}
      >
        {canEdit && (onEditTier || onDeleteTier) && (
          <div className="flex gap-0.5 mb-1">
            {onEditTier && (
              <Button size="icon" variant="ghost" className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20" onClick={onEditTier}>
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {onDeleteTier && (
              <Button size="icon" variant="ghost" className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20" onClick={onDeleteTier}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
        <span>{tier.label}</span>
      </div>
      <div className="flex-1 flex flex-wrap gap-2 p-2 items-center bg-muted/30 rounded-r-lg min-w-0">
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
