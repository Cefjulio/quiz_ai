"use client";
import { useState } from "react";
import { motion } from "framer-motion";

interface Question {
  id: string;
  prompt: { text: string };
  answers: { id: string; text: string }[];
}

type Status = "NOT_LEARNED" | "PARTIALLY_LEARNED" | "LEARNED";

interface Props {
  question: Question;
  onRate: (questionId: string, status: Status) => void;
}

export default function Flashcard({ question, onRate }: Props) {
  const [flipped, setFlipped] = useState(false);

  const back = question.answers.find((a) => a.id === "back")?.text ?? "";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Card */}
      <div
        className="w-full max-w-lg cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 25 }}
          style={{ transformStyle: "preserve-3d", position: "relative", minHeight: 220 }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 duo-card p-8 flex flex-col items-center justify-center text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Question</p>
            <p className="text-gray-800 font-bold text-xl leading-relaxed">{question.prompt.text}</p>
            <p className="text-xs text-gray-400 mt-6">Tap to flip</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 duo-card p-8 flex flex-col items-center justify-center text-center bg-[#f0fdf4]"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <p className="text-xs font-black text-[#58CC02] uppercase tracking-widest mb-4">Answer</p>
            <p className="text-gray-800 font-semibold text-lg leading-relaxed">{back}</p>
          </div>
        </motion.div>
      </div>

      {/* Rating buttons — only shown after flip */}
      {flipped && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg grid grid-cols-3 gap-3"
        >
          <button
            onClick={() => onRate(question.id, "NOT_LEARNED")}
            className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition"
          >
            <span className="text-2xl">❌</span>
            <span className="text-xs font-black text-red-600 uppercase tracking-wide">Not Learned</span>
          </button>
          <button
            onClick={() => onRate(question.id, "PARTIALLY_LEARNED")}
            className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition"
          >
            <span className="text-2xl">🤔</span>
            <span className="text-xs font-black text-yellow-600 uppercase tracking-wide text-center">Partially Learned</span>
          </button>
          <button
            onClick={() => onRate(question.id, "LEARNED")}
            className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 border-green-200 bg-green-50 hover:bg-green-100 transition"
          >
            <span className="text-2xl">✅</span>
            <span className="text-xs font-black text-green-600 uppercase tracking-wide">Learned</span>
          </button>
        </motion.div>
      )}

      {!flipped && (
        <p className="text-sm text-gray-400 font-semibold">Flip the card to see the answer, then rate yourself</p>
      )}
    </div>
  );
}
