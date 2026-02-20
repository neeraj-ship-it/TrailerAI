import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableRowProps {
  id: string;
  name: string;
}

export const SortableRow = ({ id, name }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 bg-secondary rounded-md",
        isDragging && "opacity-50"
      )}
    >
      <div 
        {...attributes} 
        {...listeners}
        className={cn(
          "cursor-grab",
          "active:cursor-grabbing",
          "hover:text-primary",
          "transition-colors"
        )}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <span className="flex-1 text-sm">{name}</span>
    </div>
  );
}; 