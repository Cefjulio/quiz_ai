"use client";
import { useState } from "react";
import { motion } from "framer-motion";

interface Question {
  id: string;
  type: string;
  prompt: { text: string };
  answers: { id: string; text: string }[];
  correctAnswer: string | string[] | Record<string, string>;
}

interface QuizAttemptRecord {
  questionId: string;
  userAnswer: unknown;
  correct: boolean;
  firstTry: boolean;
  question: Question;
}

export default function ErrorReview({
  records,
  onClose,
}: {
  records: QuizAttemptRecord[];
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(0);

  if (records.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">No mistakes to review!</h2>
          <p className="text-gray-500 mb-6">You got everything right on the first try.</p>
          <button onClick={onClose} className="duo-btn-green">Go back</button>
        </div>
      </div>
    );
  }

  const record = records[current];
  const q = record.question;
  const correctText = Array.isArray(q.answers)
    ? q.answers.find((a) => a.id === q.correctAnswer || (Array.isArray(q.correctAnswer) && (q.correctAnswer as string[]).includes(a.id)))?.text
    : null;

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
        <h1 className="font-black text-gray-800">Review Mistakes</h1>
        <span className="ml-auto text-sm font-bold text-gray-400">{current + 1}/{records.length}</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl space-y-4">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="duo-card p-6"
          >
            <p className="text-xs font-black text-[#FF4B4B] uppercase mb-2">Your mistake</p>
            <p className="text-xl font-black text-gray-800 mb-5">{q.prompt.text}</p>

            <div className="space-y-2 mb-5">
              {q.answers.map((ans) => {
                const isCorrect =
                  ans.id === q.correctAnswer ||
                  (Array.isArray(q.correctAnswer) && (q.correctAnswer as string[]).includes(ans.id));
                const wasSelected =
                  record.userAnswer === ans.id ||
                  (Array.isArray(record.userAnswer) && (record.userAnswer as string[]).includes(ans.id));
                return (
                  <div
                    key={ans.id}
                    className={`p-3 rounded-xl font-bold text-sm ${
                      isCorrect
                        ? "bg-[#d7ffb8] border-2 border-[#58CC02] text-[#46A302]"
                        : wasSelected
                        ? "bg-[#ffdfe0] border-2 border-[#FF4B4B] text-[#FF4B4B]"
                        : "bg-gray-50 border border-gray-100 text-gray-600"
                    }`}
                  >
                    {isCorrect ? "✓ " : wasSelected ? "✗ " : "  "}
                    {ans.text}
                  </div>
                );
              })}
            </div>

            {correctText && (
              <div className="bg-[#e8f9ff] rounded-xl p-3">
                <p className="text-xs font-black text-[#1CB0F6] uppercase mb-1">Remember</p>
                <p className="font-bold text-gray-700 text-sm">
                  The correct answer is: <span className="text-[#1CB0F6]">{correctText}</span>
                </p>
              </div>
            )}
          </motion.div>

          <div className="flex gap-3">
            {current > 0 && (
              <button onClick={() => setCurrent((c) => c - 1)} className="duo-btn-outline flex-1">
                ← Previous
              </button>
            )}
            {current < records.length - 1 ? (
              <button onClick={() => setCurrent((c) => c + 1)} className="duo-btn-green flex-1">
                Next →
              </button>
            ) : (
              <button onClick={onClose} className="duo-btn-green flex-1">
                Done ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
