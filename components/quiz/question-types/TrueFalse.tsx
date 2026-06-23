"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { QuestionPrompt } from "./MCQ";

interface Question {
  prompt: { text: string; imageUrl?: string; audioUrl?: string; videoUrl?: string };
  answers: { id: string; text: string }[];
  correctAnswer: string;
}

export default function TrueFalse({ question, onAnswer }: { question: Question; onAnswer: (a: unknown, correct: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  function choose(id: string) {
    if (selected) return;
    setSelected(id);
    setTimeout(() => onAnswer(id, id === question.correctAnswer), 600);
  }

  return (
    <div className="space-y-5">
      <QuestionPrompt prompt={question.prompt} />
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: "true", label: "TRUE", emoji: "✅", color: "bg-[#58CC02] border-[#46A302]" },
          { id: "false", label: "FALSE", emoji: "❌", color: "bg-[#FF4B4B] border-[#CC3333]" },
        ].map((opt) => {
          const active = selected === opt.id;
          const isCorrect = opt.id === question.correctAnswer;
          return (
            <motion.button
              key={opt.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => choose(opt.id)}
              className={`py-8 rounded-2xl font-black text-2xl text-white border-b-4 transition-all ${
                !selected ? opt.color + " hover:opacity-90 cursor-pointer" :
                active && isCorrect ? "bg-[#58CC02] border-[#46A302]" :
                active ? "bg-[#FF4B4B] border-[#CC3333] shake" :
                "bg-gray-200 border-gray-300 text-gray-400"
              }`}
            >
              <div className="text-3xl mb-1">{opt.emoji}</div>
              {opt.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
