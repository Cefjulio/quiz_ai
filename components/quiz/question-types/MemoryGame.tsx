"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { QuestionPrompt } from "./MCQ";

interface Card { id: string; text: string; pairId: string; imageUrl?: string }
interface Question {
  prompt: { text: string };
  answers: Card[];
  correctAnswer: string[];
}

export default function MemoryGame({ question, onAnswer }: { question: Question; onAnswer: (a: unknown, correct: boolean) => void }) {
  const [cards] = useState<Card[]>(() => [...question.answers].sort(() => Math.random() - 0.5));
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [disabled, setDisabled] = useState(false);

  function flip(id: string) {
    if (disabled || flipped.includes(id) || matched.includes(id)) return;
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setDisabled(true);
      const [a, b] = newFlipped.map((fid) => cards.find((c) => c.id === fid)!);
      setTimeout(() => {
        if (a.pairId === b.pairId) {
          const newMatched = [...matched, a.id, b.id];
          setMatched(newMatched);
          if (newMatched.length === cards.length) {
            setTimeout(() => onAnswer(newMatched, true), 400);
          }
        }
        setFlipped([]);
        setDisabled(false);
      }, 900);
    }
  }

  const isFlipped = (id: string) => flipped.includes(id) || matched.includes(id);

  return (
    <div className="space-y-5">
      <QuestionPrompt prompt={question.prompt} />
      <p className="text-sm font-bold text-gray-500 text-center">
        Find all matching pairs! {matched.length / 2}/{cards.length / 2} pairs found
      </p>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card) => (
          <motion.div
            key={card.id}
            onClick={() => flip(card.id)}
            className="aspect-square relative cursor-pointer"
            whileTap={{ scale: 0.9 }}
          >
            <div
              className={`flip-card absolute inset-0 ${isFlipped(card.id) ? "flipped" : ""}`}
            >
              {/* Back (hidden) */}
              <div className="flip-card-front w-full h-full rounded-xl bg-[#1CB0F6] flex items-center justify-center border-b-4 border-[#0092D9]">
                <span className="text-white text-2xl">❓</span>
              </div>
              {/* Front (revealed) */}
              <div
                className={`flip-card-back w-full h-full rounded-xl flex items-center justify-center border-b-4 text-xs font-bold text-center p-1 ${
                  matched.includes(card.id)
                    ? "bg-[#d7ffb8] border-[#58CC02] text-[#46A302]"
                    : "bg-white border-gray-300 text-gray-800"
                }`}
              >
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  card.text
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
