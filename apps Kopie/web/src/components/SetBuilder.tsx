// apps/web/src/components/SetBuilder.tsx
"use client";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "react-beautiful-dnd";

type SetItem = {
  _id: string;
  title?: string;
  topic?: string;
};

type Props = {
  selected: SetItem[];
  onChange: (next: SetItem[]) => void;
};

export default function SetBuilder({ selected, onChange }: Props) {
  function handleDragEnd(result: any) {
    if (!result.destination) return;
    const items = Array.from(selected);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    onChange(items);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="setList">
        {(provided: any) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {selected.map((item, idx) => (
              <Draggable key={item._id} draggableId={item._id} index={idx}>
                {(prov: any) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                    className="border p-2 mb-2 rounded bg-white shadow flex justify-between items-center"
                  >
                    <span className="font-medium">
                      {item.title || item.topic || "Ohne Titel"}
                    </span>
                    <span className="text-gray-400 text-xs">#{idx + 1}</span>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
