import { useDroppable } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
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
  canDrag: boolean;
  /** When true, edit/delete/move tier controls are hidden (e.g. for export image). */
  hideHoverControls?: boolean;
  onEditTier?: () => void;
  onDeleteTier?: () => void;
  onMoveTierUp?: () => void;
  onMoveTierDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function TierRow({ tier, items, canEdit, canDrag, hideHoverControls = false, onEditTier, onDeleteTier, onMoveTierUp, onMoveTierDown, isFirst, isLast }: TierRowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: tier.id });
  const itemIds = items.map((i) => i.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex min-h-[5.5rem] rounded-xl border-2 transition-all duration-150 overflow-hidden",
        isOver
          ? "border-primary/70 bg-primary/5 shadow-md shadow-primary/10"
          : "border-border/60 hover:border-border",
      )}
    >
      {/* Tier label */}
      <div
        className="relative w-14 sm:w-20 shrink-0 flex flex-col items-center justify-center"
        style={{ backgroundColor: tier.color }}
      >
        <span
          className="font-bold text-base sm:text-lg text-white drop-shadow-sm leading-tight text-center px-1 break-words max-w-full"
          style={{ wordBreak: "break-word" }}
        >
          {tier.label}
        </span>
        {/* Move arrows at the top */}
        {canEdit && !hideHoverControls && (onMoveTierUp || onMoveTierDown) && (
          <div className="absolute inset-x-0 top-0 flex justify-center gap-0.5 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {onMoveTierUp && (
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/25 disabled:opacity-30 disabled:pointer-events-none"
                onClick={onMoveTierUp}
                disabled={isFirst}
                title="Move up"
              >
                <ChevronUp className="h-2.5 w-2.5" />
              </Button>
            )}
            {onMoveTierDown && (
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/25 disabled:opacity-30 disabled:pointer-events-none"
                onClick={onMoveTierDown}
                disabled={isLast}
                title="Move down"
              >
                <ChevronDown className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        )}
        {/* Edit/delete at the bottom */}
        {canEdit && !hideHoverControls && (onEditTier || onDeleteTier) && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-0.5 pb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {onEditTier && (
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/25"
                onClick={onEditTier}
                title="Edit tier"
              >
                <Pencil className="h-2.5 w-2.5" />
              </Button>
            )}
            {onDeleteTier && (
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/25"
                onClick={onDeleteTier}
                title="Delete tier"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Items area */}
      <div
        className={cn(
          "flex-1 flex flex-wrap gap-2 p-2.5 items-center min-w-0 transition-colors duration-150",
          isOver ? "bg-primary/5" : "bg-muted/20",
        )}
      >
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

        {/* Empty state */}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground/50 italic select-none">
            {isOver ? "Release to drop here" : "Drop items here"}
          </p>
        )}
      </div>
    </div>
  );
}
