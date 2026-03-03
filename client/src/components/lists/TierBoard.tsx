import { forwardRef, useCallback, useRef, useState } from "react";
import {
  closestCorners,
  CollisionDetection,
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { TierRow, type TierItemWithDetails } from "./TierRow";
import { TierPool } from "./TierPool";
import { TierItem } from "./TierItem";

export interface TierWithItems {
  id: string;
  label: string;
  color: string;
  position: number;
  items: TierItemWithDetails[];
}

export interface TierBoardProps {
  tiers: TierWithItems[];
  unassignedItems: TierItemWithDetails[];
  canEdit: boolean;
  onMoveItem: (itemId: string, toTierId: string | null, toPosition: number) => void | Promise<void>;
  onEditTier?: (tier: TierWithItems) => void;
  onDeleteTier?: (tier: TierWithItems) => void;
  onAddTier?: () => void;
  onReorderTiers?: (tierIds: string[]) => void;
  /** When true, hover-only controls are hidden for a clean export image. */
  isExporting?: boolean;
}

const POOL_ID = "tier-pool";

/** Prefer the smallest (deepest) droppable under the pointer so we hit items, not the row. */
const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length <= 1) {
    if (pointerHits.length > 0) return pointerHits;
    return closestCorners(args);
  }
  const { droppableRects } = args;
  const sorted = [...pointerHits].sort((a, b) => {
    const rectA = droppableRects.get(a.id);
    const rectB = droppableRects.get(b.id);
    const areaA = rectA ? rectA.width * rectA.height : Infinity;
    const areaB = rectB ? rectB.width * rectB.height : Infinity;
    return areaA - areaB;
  });
  return sorted;
};

export const TierBoard = forwardRef<HTMLDivElement, TierBoardProps>(function TierBoard({
  tiers,
  unassignedItems,
  canEdit,
  onMoveItem,
  onEditTier,
  onDeleteTier,
  onAddTier,
  onReorderTiers,
  isExporting = false,
}, ref) {
  const [activeItem, setActiveItem] = useState<TierItemWithDetails | null>(null);
  const lastOverRef = useRef<{ id: string; rect: { left: number; top: number; width: number; height: number } } | null>(null);

  const findItemLocation = useCallback(
    (itemId: string): { tierId: string | null; index: number } => {
      for (let i = 0; i < tiers.length; i++) {
        const idx = tiers[i].items.findIndex((it) => it.id === itemId);
        if (idx >= 0) return { tierId: tiers[i].id, index: idx };
      }
      const poolIdx = unassignedItems.findIndex((it) => it.id === itemId);
      if (poolIdx >= 0) return { tierId: null, index: poolIdx };
      return { tierId: null, index: 0 };
    },
    [tiers, unassignedItems],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  const handleDragStart = (e: DragStartEvent) => {
    lastOverRef.current = null;
    const itemId = e.active.id as string;
    for (const t of tiers) {
      const found = t.items.find((i) => i.id === itemId);
      if (found) {
        setActiveItem(found);
        return;
      }
    }
    const found = unassignedItems.find((i) => i.id === itemId);
    if (found) setActiveItem(found);
  };

  type Rect = { left: number; top: number; width: number; height: number };

  const getDropIntent = useCallback(
    (activeId: string, activeRect: Rect | null, overId: string, overRect: Rect | null): { source: { tierId: string | null; index: number }; toTierId: string | null; toPosition: number } | null => {
      const source = findItemLocation(activeId);

      const tierMatch = tiers.find((t) => t.id === overId);
      if (tierMatch) {
        return { source, toTierId: tierMatch.id, toPosition: tierMatch.items.length };
      }

      if (overId === POOL_ID) {
        return { source, toTierId: null, toPosition: unassignedItems.length };
      }

      const tierByItem = tiers.find((t) => t.items.some((i) => i.id === overId));
      if (tierByItem) {
        const overIndex = tierByItem.items.findIndex((i) => i.id === overId);
        if (overIndex < 0) return null;
        let insertAfter = false;
        if (activeRect && overRect) {
          const activeCenterX = activeRect.left + activeRect.width / 2;
          const overCenterX = overRect.left + overRect.width / 2;
          insertAfter = activeCenterX > overCenterX;
        }
        let toPosition = overIndex + (insertAfter ? 1 : 0);
        if (source.tierId === tierByItem.id && source.index < toPosition) toPosition -= 1;
        return { source, toTierId: tierByItem.id, toPosition: Math.max(0, toPosition) };
      }

      const poolIndex = unassignedItems.findIndex((i) => i.id === overId);
      if (poolIndex >= 0) {
        let insertAfter = false;
        if (activeRect && overRect) {
          insertAfter = activeRect.left + activeRect.width / 2 > overRect.left + overRect.width / 2;
        }
        let toPosition = poolIndex + (insertAfter ? 1 : 0);
        if (source.tierId === null && source.index < toPosition) toPosition -= 1;
        return { source, toTierId: null, toPosition: Math.max(0, toPosition) };
      }

      return null;
    },
    [findItemLocation, tiers, unassignedItems],
  );

  const handleDragOver = (e: DragOverEvent) => {
    if (e.over) {
      lastOverRef.current = { id: e.over.id as string, rect: e.over.rect };
    } else {
      lastOverRef.current = null;
    }
  };

  const handleDragCancel = (_e: DragCancelEvent) => {
    lastOverRef.current = null;
    setActiveItem(null);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveItem(null);
    const itemId = e.active.id as string;
    const activeRect = e.active.rect.current.translated ?? e.active.rect.current.initial;
    const over = e.over ?? lastOverRef.current;
    lastOverRef.current = null;

    const overId = over != null && typeof over === "object" && "id" in over ? String((over as { id: unknown }).id) : null;
    const overRect = over != null && typeof over === "object" && "rect" in over ? (over as { rect: Rect }).rect : null;

    if (!overId) return;
    const dropIntent = getDropIntent(itemId, activeRect, overId, overRect);
    if (!dropIntent) return;

    const { source, toTierId, toPosition } = dropIntent;
    if (source.tierId === toTierId && source.index === toPosition) return;

    onMoveItem(itemId, toTierId, toPosition);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div ref={ref} className="space-y-2" data-tier-board-capture>
        {tiers.map((tier, idx) => (
          <TierRow
            key={tier.id}
            tier={tier}
            items={tier.items}
            canEdit={canEdit}
            canDrag={canEdit}
            hideHoverControls={isExporting}
            onEditTier={onEditTier ? () => onEditTier(tier) : undefined}
            onDeleteTier={onDeleteTier ? () => onDeleteTier(tier) : undefined}
            isFirst={idx === 0}
            isLast={idx === tiers.length - 1}
            onMoveTierUp={onReorderTiers && idx > 0 ? () => {
              const ids = tiers.map((t) => t.id);
              [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
              onReorderTiers(ids);
            } : undefined}
            onMoveTierDown={onReorderTiers && idx < tiers.length - 1 ? () => {
              const ids = tiers.map((t) => t.id);
              [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
              onReorderTiers(ids);
            } : undefined}
          />
        ))}
        {canEdit && onAddTier && !isExporting && (
          <button
            type="button"
            onClick={onAddTier}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Add tier
          </button>
        )}
        <TierPool id={POOL_ID} items={unassignedItems} canDrag={canEdit} />
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeItem ? (
          <TierItem
            id={activeItem.id}
            coverUrl={activeItem.media.coverUrl}
            coverGradient={activeItem.media.coverGradient}
            title={activeItem.media.title}
            className="w-20 h-20 opacity-100 shadow-2xl ring-2 ring-primary scale-110 rotate-2"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});
