import { useCallback, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
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

interface TierBoardProps {
  tiers: TierWithItems[];
  unassignedItems: TierItemWithDetails[];
  canEdit: boolean;
  onMoveItem: (itemId: string, toTierId: string | null, toPosition: number) => Promise<void>;
  onEditTier?: (tier: TierWithItems) => void;
  onDeleteTier?: (tier: TierWithItems) => void;
}

const POOL_ID = "tier-pool";

export function TierBoard({
  tiers,
  unassignedItems,
  canEdit,
  onMoveItem,
  onEditTier,
  onDeleteTier,
}: TierBoardProps) {
  const [activeItem, setActiveItem] = useState<TierItemWithDetails | null>(null);

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
  );

  const handleDragStart = (e: DragStartEvent) => {
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

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveItem(null);
    const itemId = e.active.id as string;
    const overId = e.over?.id as string | undefined;

    if (!overId) return;

    let toTierId: string | null;
    let toPosition: number;

    if (overId === POOL_ID) {
      toTierId = null;
      toPosition = unassignedItems.length;
    } else {
      const tierMatch = tiers.find((t) => t.id === overId);
      if (tierMatch) {
        toTierId = tierMatch.id;
        toPosition = tierMatch.items.length;
      } else {
        const itemMatch = tiers.flatMap((t) => t.items).find((i) => i.id === overId)
          ?? unassignedItems.find((i) => i.id === overId);
        if (itemMatch) {
          if (itemMatch.tierId) {
            toTierId = itemMatch.tierId;
            const tier = tiers.find((t) => t.id === itemMatch.tierId);
            const idx = tier ? tier.items.findIndex((i) => i.id === overId) : 0;
            toPosition = idx >= 0 ? idx : (tier?.items.length ?? 0);
          } else {
            toTierId = null;
            const idx = unassignedItems.findIndex((i) => i.id === overId);
            toPosition = idx >= 0 ? idx : unassignedItems.length;
          }
        } else {
          return;
        }
      }
    }

    await onMoveItem(itemId, toTierId, toPosition);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-3">
        {tiers.map((tier) => (
          <TierRow
            key={tier.id}
            tier={tier}
            items={tier.items}
            canEdit={canEdit}
            onEditTier={onEditTier ? () => onEditTier(tier) : undefined}
            onDeleteTier={onDeleteTier ? () => onDeleteTier(tier) : undefined}
          />
        ))}
        <TierPool id={POOL_ID} items={unassignedItems} />
      </div>

      <DragOverlay>
        {activeItem ? (
          <TierItem
            id={activeItem.id}
            coverUrl={activeItem.media.coverUrl}
            coverGradient={activeItem.media.coverGradient}
            title={activeItem.media.title}
            className="w-20 h-20 opacity-95 shadow-xl"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

