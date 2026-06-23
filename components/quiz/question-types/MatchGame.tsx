"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { QuestionPrompt } from "./MCQ";

interface Answer { id: string; text: string; side?: string; pairId?: string }
interface Question {
  prompt: { text: string };
  answers: Answer[];
  correctAnswer: Record<string, string>;
}

export default function MatchGame({ question, onAnswer }: { question: Question; onAnswer: (a: unknown, correct: boolean) => void }) {
  const leftItems = question.answers.filter((a) => a.side === "left" || a.id.startsWith("l"));
  const rightItems = question.answers.filter((a) => a.side === "right" || a.id.startsWith("r"));

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [wrong, setWrong] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function selectLeft(id: string) {
    if (submitted || matched[id]) return;
    setSelectedLeft(id === selectedLeft ? null : id);
  }

  function selectRight(id: string) {
    if (submitted || !selectedLeft) return;
    const alreadyMatched = Object.values(matched).includes(id);
    if (alreadyMatched) return;

    const newMatched = { ...matched, [selectedLeft]: id };
    setMatched(newMatched);
    setSelectedLeft(null);

    if (Object.keys(newMatched).length === leftItems.length) {
      setSubmitted(true);
      const isCorrect = Object.entries(newMatched).every(
        ([l, r]) => question.correctAnswer[l] === r
      );
      const wrongPairs = Object.entries(newMatched)
        .filter(([l, r]) => question.correctAnswer[l] !== r)
        .flatMap(([l, r]) => [l, r]);
      setWrong(wrongPairs);
      setTimeout(() => onAnswer(newMatched, isCorrect), 800);
    }
  }

  return (
    <div className="space-y-5">
      <QuestionPrompt prompt={question.prompt} />
      <p className="text-sm font-bold text-gray-500 text-center">Tap a left item, then its match on the right</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {leftItems.map((item) => {
            const isMatched = matched[item.id];
            const isSelected = selectedLeft === item.id;
            const isWrong = wrong.includes(item.id);
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => selectLeft(item.id)}
                className={`w-full duo-card p-3 font-bold text-sm text-left transition-colors ${
                  isWrong ? "border-[#FF4B4B] bg-[#ffdfe0]" :
                  isMatched ? "border-[#58CC02] bg-[#d7ffb8]" :
                  isSelected ? "border-[#1CB0F6] bg-[#e8f9ff]" :
                  "hover:border-[#1CB0F6] cursor-pointer"
                }`}
              >
                {item.text}
              </motion.button>
            );
          })}
        </div>
        <div className="space-y-2">
          {rightItems.map((item) => {
            const isMatched = Object.values(matched).includes(item.id);
            const isWrong = wrong.includes(item.id);
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => selectRight(item.id)}
                className={`w-full duo-card p-3 font-bold text-sm text-left transition-colors ${
                  isWrong ? "border-[#FF4B4B] bg-[#ffdfe0]" :
                  isMatched ? "border-[#58CC02] bg-[#d7ffb8]" :
                  selectedLeft ? "border-[#CE82FF] hover:bg-purple-50 cursor-pointer" :
                  "opacity-60 cursor-default"
                }`}
              >
                {item.text}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
