"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import MCQ from "./question-types/MCQ";
import TrueFalse from "./question-types/TrueFalse";
import FillBlank from "./question-types/FillBlank";
import DragDrop from "./question-types/DragDrop";
import MatchGame from "./question-types/MatchGame";
import MemoryGame from "./question-types/MemoryGame";
import Dropdown from "./question-types/Dropdown";
import ErrorReview from "./ErrorReview";

const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

interface Question {
  id: string;
  type: string;
  prompt: { text: string; imageUrl?: string; audioUrl?: string; videoUrl?: string };
  answers: { id: string; text: string; imageUrl?: string; audioUrl?: string }[];
  correctAnswer: string | string[] | Record<string, string>;
}

interface QuizAttemptRecord {
  questionId: string;
  userAnswer: unknown;
  correct: boolean;
  firstTry: boolean;
  question: Question;
}

type QuizState = "quiz" | "feedback" | "complete" | "review";

export default function QuizRunner({
  quiz,
  spotId,
  courseId,
  errorReview,
}: {
  quiz: { id: string; title: string; questions: Question[] };
  spotId: string;
  courseId: string;
  errorReview: QuizAttemptRecord[];
}) {
  const router = useRouter();
  const [state, setState] = useState<QuizState>("quiz");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [lives, setLives] = useState(5);
  const [queue, setQueue] = useState<Question[]>(quiz.questions);
  const [firstTryWrong, setFirstTryWrong] = useState<Set<string>>(new Set());
  const [showReview, setShowReview] = useState(false);

  const current = queue[currentIdx];
  const progress = Math.round((currentIdx / queue.length) * 100);

  const handleAnswer = useCallback(
    (answer: unknown, isCorrect: boolean) => {
      const wasFirstTry = !firstTryWrong.has(current.id);
      if (!isCorrect && wasFirstTry) {
        setFirstTryWrong((prev) => { const s = new Set(prev); s.add(current.id); return s; });
      }

      setAttempts((prev) => [
        ...prev,
        {
          questionId: current.id,
          userAnswer: answer,
          correct: isCorrect,
          firstTry: wasFirstTry,
          question: current,
        },
      ]);

      if (!isCorrect) {
        setLives((l) => l - 1);
      }
      setFeedback(isCorrect ? "correct" : "wrong");
    },
    [current, firstTryWrong]
  );

  function continueAfterFeedback() {
    setFeedback(null);

    if (feedback === "wrong") {
      // Re-add the question at the end of queue
      const wrongQ = queue[currentIdx];
      setQueue((prev) => [...prev, wrongQ]);
    }

    if (currentIdx + 1 >= queue.length && feedback !== "wrong") {
      finishQuiz();
    } else if (currentIdx + 1 >= queue.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  async function finishQuiz() {
    const passed = lives > 0;
    const score = Math.round(
      (attempts.filter((a) => a.correct).length / attempts.length) * 100
    );

    await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quizId: quiz.id,
        questionAttempts: attempts,
        passed,
        score,
        totalQuestions: quiz.questions.length,
        pathSpotId: spotId,
      }),
    });
    setState("complete");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderQuestion = (q: Question) => {
    const props = { question: q as any, onAnswer: handleAnswer };
    switch (q.type) {
      case "MCQ": return <MCQ {...props} />;
      case "TRUE_FALSE": return <TrueFalse {...props} />;
      case "FILL_BLANK": return <FillBlank {...props} />;
      case "DRAG_DROP": return <DragDrop {...props} />;
      case "MATCH": return <MatchGame {...props} />;
      case "MEMORY": return <MemoryGame {...props} />;
      case "DROPDOWN": return <Dropdown {...props} />;
      default: return <MCQ {...props} />;
    }
  };

  if (showReview) {
    return <ErrorReview records={errorReview} onClose={() => setShowReview(false)} />;
  }

  if (state === "complete") {
    const correct = attempts.filter((a) => a.correct && a.firstTry).length;
    const passed = lives > 0;
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
        {passed && <Confetti recycle={false} numberOfPieces={300} />}
        <div className="text-center max-w-md w-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-8xl mb-6"
          >
            {passed ? "🎉" : "😔"}
          </motion.div>
          <h1 className="text-4xl font-black text-gray-800 mb-2">
            {passed ? "Lesson Complete!" : "Keep Trying!"}
          </h1>
          <p className="text-gray-500 font-semibold mb-6">
            {passed
              ? `You got ${correct}/${quiz.questions.length} correct on first try!`
              : "You ran out of lives. Practice and try again!"}
          </p>
          <div className="duo-card p-6 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-black text-[#58CC02]">{correct}</p>
                <p className="text-xs font-bold text-gray-400 uppercase">Correct</p>
              </div>
              <div>
                <p className="text-3xl font-black text-[#FF4B4B]">{firstTryWrong.size}</p>
                <p className="text-xs font-bold text-gray-400 uppercase">Errors</p>
              </div>
              <div>
                <p className="text-3xl font-black text-[#FFC800]">+{passed ? 10 : 0}</p>
                <p className="text-xs font-bold text-gray-400 uppercase">XP earned</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => router.push(`/learn/${courseId}`)} className="duo-btn-green w-full text-lg">
              Continue →
            </button>
            {firstTryWrong.size > 0 && (
              <button onClick={() => setShowReview(true)} className="duo-btn-outline w-full text-sm">
                Review {firstTryWrong.size} mistake{firstTryWrong.size !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => router.push(`/learn/${courseId}`)}
          className="text-gray-400 hover:text-gray-600 font-bold text-lg"
        >
          ✕
        </button>
        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full bg-[#58CC02] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Lives */}
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < lives ? "text-red-500" : "text-gray-200"}>
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 relative">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current?.id || currentIdx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.25 }}
            >
              {current && renderQuestion(current)}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Feedback overlay */}
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
                            (a) => a.id === current.correctAnswer ||
                              (Array.isArray(current.correctAnswer) && (current.correctAnswer as string[]).includes(a.id))
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
    </div>
  );
}
