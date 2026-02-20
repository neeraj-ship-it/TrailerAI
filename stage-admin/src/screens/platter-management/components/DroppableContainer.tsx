import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";

interface DroppableContainerProps {
  children: ReactNode;
}

export const DroppableContainer = ({ children }: DroppableContainerProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'droppable-container',
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all duration-200 ${
        isOver ? 'ring-2 ring-green-500 ring-opacity-50 bg-green-500/10' : ''
      }`}
    >
      {children}
    </div>
  );
}; 