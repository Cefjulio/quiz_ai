"use client";
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { QuestionPrompt } from "./MCQ";

interface Answer { id: string; text: string }
interface Question {
  prompt: { text: string };
  answers: Answer[];
  correctAnswer: string[];
}

function SortableItem({ id, text }: { id: string; text: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`duo-card p-4 cursor-grab active:cursor-grabbing font-bold text-gray-800 flex items-center gap-3 ${isDragging ? "opacity-50 shadow-xl" : ""}`}
    >
      <span className="text-gray-400">⠿</span>
      {text}
    </div>
  );
}

export default function DragDrop({ question, onAnswer }: { question: Question; onAnswer: (a: unknown, correct: boolean) => void }) {
  const [items, setItems] = useState<Answer[]>([...question.answers].sort(() => Math.random() - 0.5));
  const [submitted, setSubmitted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const from = prev.findIndex((i) => i.id === active.id);
        const to = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, from, to);
      });
    }
  }

  function check() {
    if (submitted) return;
    setSubmitted(true);
    const currentOrder = items.map((i) => i.id);
    const isCorrect = JSON.stringify(currentOrder) === JSON.stringify(question.correctAnswer);
    setTimeout(() => onAnswer(currentOrder, isCorrect), 600);
  }

  return (
    <div className="space-y-5">
      <QuestionPrompt prompt={question.prompt} />
      <p className="text-sm font-bold text-gray-500 text-center">Drag to put in the correct order</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item) => (
              <SortableItem key={item.id} id={item.id} text={item.text} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button onClick={check} disabled={submitted} className="duo-btn-green w-full disabled:opacity-50">
        Check Order
      </button>
    </div>
  );
}
