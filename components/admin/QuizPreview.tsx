"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import MCQ from "@/components/quiz/question-types/MCQ";
import FlashcardCard from "@/components/quiz/question-types/Flashcard";
import TrueFalse from "@/components/quiz/question-types/TrueFalse";
import FillBlank from "@/components/quiz/question-types/FillBlank";
import DragDrop from "@/components/quiz/question-types/DragDrop";
import MatchGame from "@/components/quiz/question-types/MatchGame";
import MemoryGame from "@/components/quiz/question-types/MemoryGame";
import Dropdown from "@/components/quiz/question-types/Dropdown";

const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

interface Question {
  id: string;
  type: string;
  prompt: { text: string; imageUrl?: string; audioUrl?: string; videoUrl?: string };
  answers: { id: string; text: string; imageUrl?: string; audioUrl?: string }[];
  correctAnswer: string | string[] | Record<string, string>;
}

interface Props {
  quiz: { id: string; title: string; questions: Question[] };
  onClose: () => void;
}

export default function QuizPreview({ quiz, onClose }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [queue, setQueue] = useState<Question[]>(quiz.questions);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [firstTryWrong, setFirstTryWrong] = useState<Set<string>>(new Set());
  const [lives, setLives] = useState(5);
  const [done, setDone] = useState(false);

  const current = queue[currentIdx];
  const progress = Math.round((currentIdx / queue.length) * 100);

  const handleAnswer = useCallback(
    (answer: unknown, isCorrect: boolean) => {
      void answer;
      const wasFirstTry = !firstTryWrong.has(current.id);
      if (!isCorrect && wasFirstTry) {
        setFirstTryWrong((prev) => { const s = new Set(prev); s.add(current.id); return s; });
        setLives((l) => l - 1);
      }
      setFeedback(isCorrect ? "correct" : "wrong");
    },
    [current, firstTryWrong]
  );

  function continueAfterFeedback() {
    setFeedback(null);
    if (feedback === "wrong") {
      setQueue((prev) => [...prev, queue[currentIdx]]);
    }
    const next = currentIdx + 1;
    if (next >= queue.length && feedback !== "wrong") {
      setDone(true);
    } else {
      setCurrentIdx(next);
    }
  }

  function restart() {
    setCurrentIdx(0);
    setQueue(quiz.questions);
    setFeedback(null);
    setFirstTryWrong(new Set());
    setLives(5);
    setDone(false);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderQuestion = (q: Question) => {
    const props = { question: q as any, onAnswer: handleAnswer };
    switch (q.type) {
      case "MCQ":       return <MCQ {...props} />;
      case "TRUE_FALSE":return <TrueFalse {...props} />;
      case "FILL_BLANK":return <FillBlank {...props} />;
      case "DRAG_DROP": return <DragDrop {...props} />;
      case "MATCH":     return <MatchGame {...props} />;
      case "MEMORY":    return <MemoryGame {...props} />;
      case "DROPDOWN":  return <Dropdown {...props} />;
      case "FLASHCARD": return <FlashcardCard question={q} onRate={(_, status) => handleAnswer(status, true)} />;
      default:          return <MCQ {...props} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col">
      {/* Modal chrome */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full bg-[#58CC02] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < lives ? "text-red-500 text-sm" : "text-gray-200 text-sm"}>❤️</span>
          ))}
        </div>
        <span className="text-xs font-black text-[#58CC02] uppercase tracking-wide">Preview</span>
      </div>

      {/* Content */}
      <div className="flex-1 bg-[#f7f7f7] overflow-y-auto flex flex-col">
        {done ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <Confetti recycle={false} numberOfPieces={200} />
            <div className="text-center max-w-sm w-full">
              <div className="text-7xl mb-4">🎉</div>
              <h2 className="text-3xl font-black text-gray-800 mb-2">Quiz Complete!</h2>
              <p className="text-gray-500 font-semibold mb-6">
                {firstTryWrong.size === 0
                  ? "Perfect score — all questions correct on first try!"
                  : `${firstTryWrong.size} question${firstTryWrong.size !== 1 ? "s" : ""} needed a retry.`}
              </p>
              <div className="duo-card p-5 mb-6 grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-3xl font-black text-[#58CC02]">
                    {quiz.questions.length - firstTryWrong.size}/{quiz.questions.length}
                  </p>
                  <p className="text-xs font-bold text-gray-400 uppercase">First try</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-[#FF4B4B]">{firstTryWrong.size}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase">Retried</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={restart} className="duo-btn-outline flex-1 text-sm">↺ Try Again</button>
                <button onClick={onClose} className="duo-btn-green flex-1 text-sm">Done ✓</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-4 py-6 relative">
            <div className="w-full max-w-xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current?.id || currentIdx}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.2 }}
                >
                  {current && renderQuestion(current)}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Feedback banner */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  className={`absolute bottom-0 left-0 right-0 p-6 ${
                    feedback === "correct" ? "bg-[#d7ffb8]" : "bg-[#ffdfe0]"
                  }`}
                >
                  <div className="max-w-xl mx-auto">
                    <p className={`text-xl font-black mb-1 ${feedback === "correct" ? "text-[#46A302]" : "text-[#FF4B4B]"}`}>
                      {feedback === "correct" ? "✓ Correct!" : "✗ Incorrect"}
                    </p>
                    {feedback === "wrong" && current && (
                      <p className="text-sm font-semibold text-gray-600 mb-3">
                        Correct answer:{" "}
                        <span className="font-black">
                          {Array.isArray(current.answers)
                            ? current.answers.find(
                                (a) =>
                                  a.id === current.correctAnswer ||
                                  (Array.isArray(current.correctAnswer) &&
                                    (current.correctAnswer as string[]).includes(a.id))
                              )?.text || String(current.correctAnswer)
                            : String(current.correctAnswer)}
                        </span>
                      </p>
                    )}
                    <button
                      onClick={continueAfterFeedback}
                      className={`duo-btn w-full ${feedback === "correct" ? "duo-btn-green" : "duo-btn-red"}`}
                    >
                      {currentIdx + 1 >= queue.length && feedback === "correct" ? "Finish" : "Continue"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
