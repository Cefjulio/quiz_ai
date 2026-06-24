"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import FlashcardCard from "./question-types/Flashcard";

const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

type Status = "NOT_LEARNED" | "PARTIALLY_LEARNED" | "LEARNED";

interface Question {
  id: string;
  type: string;
  prompt: { text: string };
  answers: { id: string; text: string }[];
  correctAnswer: string;
}


interface Props {
  quiz: { id: string; title: string; questions: Question[] };
  spotId: string;
  courseId: string;
  initialProgress?: Record<string, Status>; // questionId -> status
}

const STATUS_LABELS: Record<Status, string> = {
  NOT_LEARNED: "Not Learned",
  PARTIALLY_LEARNED: "Partially Learned",
  LEARNED: "Learned",
};
const STATUS_COLORS: Record<Status, string> = {
  NOT_LEARNED: "bg-red-100 text-red-700",
  PARTIALLY_LEARNED: "bg-yellow-100 text-yellow-700",
  LEARNED: "bg-green-100 text-green-700",
};
const STATUS_EMOJI: Record<Status, string> = {
  NOT_LEARNED: "❌",
  PARTIALLY_LEARNED: "🤔",
  LEARNED: "✅",
};

type Deck = "ALL" | Status;

export default function FlashcardRunner({ quiz, spotId, courseId, initialProgress = {} }: Props) {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [ratings, setRatings] = useState<Record<string, Status>>(initialProgress);
  const [done, setDone] = useState(false);
  const [activeDeck, setActiveDeck] = useState<Deck>("ALL");
  const [saving, setSaving] = useState(false);
  // Show deck picker intro when there's existing progress
  const hasProgress = Object.keys(initialProgress).length > 0;
  const [showPicker, setShowPicker] = useState(hasProgress);

  const allQuestions = quiz.questions;

  const deckQuestions: Question[] =
    activeDeck === "ALL"
      ? allQuestions
      : allQuestions.filter((q) => ratings[q.id] === activeDeck);

  const current = deckQuestions[currentIdx];
  const progress = deckQuestions.length > 0
    ? Math.round(((currentIdx + 1) / deckQuestions.length) * 100)
    : 0;

  const counts = {
    LEARNED: allQuestions.filter((q) => ratings[q.id] === "LEARNED").length,
    PARTIALLY_LEARNED: allQuestions.filter((q) => ratings[q.id] === "PARTIALLY_LEARNED").length,
    NOT_LEARNED: allQuestions.filter((q) => ratings[q.id] === "NOT_LEARNED").length,
    unrated: allQuestions.filter((q) => !ratings[q.id]).length,
  };

  async function saveProgress(questionId: string, status: Status) {
    await fetch("/api/flashcards/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, status }),
    });
  }

  async function handleRate(questionId: string, status: Status) {
    setRatings((prev) => ({ ...prev, [questionId]: status }));
    void saveProgress(questionId, status);

    const next = currentIdx + 1;
    if (next >= deckQuestions.length) {
      // Mark spot progress if all cards rated at least once
      const newRatings = { ...ratings, [questionId]: status };
      const allRated = allQuestions.every((q) => newRatings[q.id]);
      if (allRated) {
        setSaving(true);
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pathSpotId: spotId }),
        });
        setSaving(false);
      }
      setDone(true);
    } else {
      setCurrentIdx(next);
    }
  }

  function startDeck(deck: Deck) {
    setActiveDeck(deck);
    setCurrentIdx(0);
    setDone(false);
    setShowPicker(false);
  }

  // Deck picker intro screen
  if (showPicker) {
    const unrated = allQuestions.filter((q) => !ratings[q.id]).length;
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push(`/learn/${courseId}`)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
          <p className="font-black text-gray-700 flex-1 truncate">{quiz.title}</p>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">🃏</div>
              <h2 className="text-2xl font-black text-gray-800">Choose your deck</h2>
              <p className="text-gray-500 font-semibold mt-1">{allQuestions.length} cards total</p>
            </div>

            {/* Stats overview */}
            <div className="duo-card p-4 mb-6 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-black text-[#58CC02]">{counts.LEARNED}</p>
                <p className="text-xs font-bold text-gray-400 uppercase leading-tight">Learned</p>
              </div>
              <div>
                <p className="text-xl font-black text-[#FFC800]">{counts.PARTIALLY_LEARNED}</p>
                <p className="text-xs font-bold text-gray-400 uppercase leading-tight">Partial</p>
              </div>
              <div>
                <p className="text-xl font-black text-[#FF4B4B]">{counts.NOT_LEARNED}</p>
                <p className="text-xs font-bold text-gray-400 uppercase leading-tight">Not Learned</p>
              </div>
            </div>

            {/* Deck options */}
            <div className="space-y-3">
              <button
                onClick={() => startDeck("ALL")}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <span className="text-xl">🃏</span>
                  <span>Practice All Cards</span>
                </span>
                <span className="text-sm opacity-60">{allQuestions.length} cards →</span>
              </button>

              {counts.NOT_LEARNED > 0 && (
                <button
                  onClick={() => startDeck("NOT_LEARNED")}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-700 font-bold hover:bg-red-100 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">❌</span>
                    <span>Practice Not Learned</span>
                  </span>
                  <span className="text-sm opacity-60">{counts.NOT_LEARNED} cards →</span>
                </button>
              )}

              {counts.PARTIALLY_LEARNED > 0 && (
                <button
                  onClick={() => startDeck("PARTIALLY_LEARNED")}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-yellow-50 border-2 border-yellow-200 text-yellow-700 font-bold hover:bg-yellow-100 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">🤔</span>
                    <span>Practice Partially Learned</span>
                  </span>
                  <span className="text-sm opacity-60">{counts.PARTIALLY_LEARNED} cards →</span>
                </button>
              )}

              {unrated > 0 && (
                <button
                  onClick={() => startDeck("ALL")}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-blue-50 border-2 border-blue-200 text-blue-700 font-bold hover:bg-blue-100 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">✨</span>
                    <span>New Cards</span>
                  </span>
                  <span className="text-sm opacity-60">{unrated} cards →</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    const allLearned = allQuestions.every((q) => ratings[q.id] === "LEARNED");
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
        {allLearned && <Confetti recycle={false} numberOfPieces={200} />}
        <div className="text-center max-w-md w-full">
          <div className="text-7xl mb-4">{allLearned ? "🎉" : "📊"}</div>
          <h2 className="text-3xl font-black text-gray-800 mb-2">
            {activeDeck === "ALL" ? "Round Complete!" : `${STATUS_LABELS[activeDeck as Status]} deck done!`}
          </h2>
          <p className="text-gray-500 font-semibold mb-6">
            {saving ? "Saving progress…" : "Here's how you rated each card:"}
          </p>

          {/* Deck summary */}
          <div className="duo-card p-5 mb-6 grid grid-cols-3 gap-3 text-center">
            {(["LEARNED", "PARTIALLY_LEARNED", "NOT_LEARNED"] as Status[]).map((s) => (
              <div key={s}>
                <p className="text-2xl font-black" style={{ color: s === "LEARNED" ? "#58CC02" : s === "PARTIALLY_LEARNED" ? "#FFC800" : "#FF4B4B" }}>
                  {counts[s]}
                </p>
                <p className="text-xs font-bold text-gray-400 uppercase leading-tight">{STATUS_LABELS[s]}</p>
              </div>
            ))}
          </div>

          {/* Review decks */}
          <div className="space-y-3 mb-6">
            {(["NOT_LEARNED", "PARTIALLY_LEARNED"] as Status[]).map((s) => {
              const count = counts[s];
              if (count === 0) return null;
              return (
                <button
                  key={s}
                  onClick={() => startDeck(s)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm ${STATUS_COLORS[s]}`}
                >
                  <span>{STATUS_EMOJI[s]} Practice {STATUS_LABELS[s]} ({count})</span>
                  <span>→</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowPicker(true)} className="duo-btn-outline flex-1 text-sm">↺ Choose deck</button>
            <button onClick={() => router.push(`/learn/${courseId}`)} className="duo-btn-green flex-1 text-sm">
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.push(`/learn/${courseId}`)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black text-gray-500">{quiz.title}</span>
            {activeDeck !== "ALL" && (
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${STATUS_COLORS[activeDeck as Status]}`}>
                {STATUS_EMOJI[activeDeck as Status]} {STATUS_LABELS[activeDeck as Status]}
              </span>
            )}
          </div>
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="h-2 rounded-full bg-[#58CC02] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="text-sm font-bold text-gray-400">{currentIdx + 1}/{deckQuestions.length}</span>
      </div>

      {/* Deck pills */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto">
        <button
          onClick={() => startDeck("ALL")}
          className={`flex-shrink-0 text-xs font-black px-3 py-1 rounded-full ${activeDeck === "ALL" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
        >
          All ({allQuestions.length})
        </button>
        {(["NOT_LEARNED", "PARTIALLY_LEARNED", "LEARNED"] as Status[]).map((s) => {
          const c = counts[s];
          if (c === 0) return null;
          return (
            <button
              key={s}
              onClick={() => startDeck(s)}
              className={`flex-shrink-0 text-xs font-black px-3 py-1 rounded-full ${activeDeck === s ? "bg-gray-800 text-white" : STATUS_COLORS[s] + " hover:opacity-80"}`}
            >
              {STATUS_EMOJI[s]} {STATUS_LABELS[s]} ({c})
            </button>
          );
        })}
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={current?.id ?? currentIdx}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2 }}
            >
              {current && (
                <FlashcardCard
                  question={current}
                  onRate={handleRate}
                />
              )}
              {!current && (
                <div className="text-center text-gray-400 py-12">
                  <p className="font-bold">No cards in this deck yet.</p>
                  <button onClick={() => startDeck("ALL")} className="duo-btn-green mt-4">Back to all cards</button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
