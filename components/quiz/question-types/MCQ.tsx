"use client";
import { useState } from "react";
import { motion } from "framer-motion";

interface Answer { id: string; text: string; imageUrl?: string; audioUrl?: string; }
interface Question {
  prompt: { text: string; imageUrl?: string; audioUrl?: string; videoUrl?: string };
  answers: Answer[];
  correctAnswer: string;
}

export default function MCQ({ question, onAnswer }: { question: Question; onAnswer: (a: unknown, correct: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  function choose(id: string) {
    if (selected) return;
    setSelected(id);
    const isCorrect = id === question.correctAnswer;
    setTimeout(() => onAnswer(id, isCorrect), 600);
  }

  return (
    <div className="space-y-5">
      <QuestionPrompt prompt={question.prompt} />
      <div className="grid grid-cols-2 gap-3">
        {question.answers.map((ans) => {
          const state = !selected
            ? "idle"
            : ans.id === question.correctAnswer
            ? "correct"
            : ans.id === selected
            ? "wrong"
            : "idle";
          return (
            <motion.button
              key={ans.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => choose(ans.id)}
              className={`duo-card p-4 text-left font-bold transition-colors ${
                state === "correct"
                  ? "border-[#58CC02] bg-[#d7ffb8]"
                  : state === "wrong"
                  ? "border-[#FF4B4B] bg-[#ffdfe0] shake"
                  : "hover:border-[#1CB0F6] cursor-pointer"
              }`}
            >
              {ans.imageUrl && <img src={ans.imageUrl} alt="" className="w-full h-20 object-cover rounded-lg mb-2" />}
              {ans.text}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export function QuestionPrompt({ prompt }: { prompt: Question["prompt"] }) {
  return (
    <div className="duo-card p-6 text-center">
      {prompt.imageUrl && <img src={prompt.imageUrl} alt="" className="w-full max-h-40 object-cover rounded-xl mb-3" />}
      {prompt.videoUrl && <video src={prompt.videoUrl} controls className="w-full max-h-36 rounded-xl mb-3" />}
      {prompt.audioUrl && <audio src={prompt.audioUrl} controls className="w-full mb-3" />}
      <p className="text-xl font-black text-gray-800">{prompt.text}</p>
    </div>
  );
}
