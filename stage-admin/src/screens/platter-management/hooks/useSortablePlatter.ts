import { useState, useCallback, useMemo } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Content } from "./usePlatter";

interface UseSortablePlatterProps {
  items: Content[];
  onItemsChange: (items: Content[]) => void;
}

export const useSortablePlatter = ({
  items,
  onItemsChange,
}: UseSortablePlatterProps) => {
  const [activeId, setActiveId] = useState<number | null>(null);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoize the items array to prevent unnecessary re-renders
  const itemIds = useMemo(() => items.map((_, index) => index), [items]);

  // Handle drag start event
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
  }, []);

  // Handle drag end event
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = Number(active.id);
        const newIndex = Number(over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        onItemsChange(newItems);
      }
      setActiveId(null);
    },
    [items, onItemsChange]
  );

  // Get the active item for the overlay
  const activeItem = useMemo(() => {
    return activeId !== null ? items[activeId] : undefined;
  }, [activeId, items]);

  return {
    sensors,
    itemIds,
    activeId,
    activeItem,
    handleDragStart,
    handleDragEnd,
  };
};
