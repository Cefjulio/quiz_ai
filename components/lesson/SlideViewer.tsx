"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface Slide {
  type: string;
  content: string;
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  fileUrl?: string;
  summary?: string[]; // per-page bullet points from AI
}

interface Lesson {
  id: string;
  title: string;
  slides: Slide[];
}

// ─── Split-view for PDF-page lessons ────────────────────────────────────────

function PdfSplitViewer({
  lesson,
  spotId,
  courseId,
}: {
  lesson: Lesson;
  spotId: string;
  courseId: string;
}) {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completing, setCompleting] = useState(false);

  const pageSlides = lesson.slides.filter((s) => s.type === "pdf_page");
  const current = pageSlides[currentIdx];
  const isLast = currentIdx === pageSlides.length - 1;

  // Each slide carries its own per-page summary bullets
  const summaryLines: string[] = current?.summary ?? [];

  async function complete() {
    setCompleting(true);
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathSpotId: spotId }),
    });
    toast.success("Lesson complete! 🎉");
    router.push(`/learn/${courseId}`);
    router.refresh();
  }

  return (
    <div className="h-screen bg-[#f7f7f7] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <button
          onClick={() => router.push(`/learn/${courseId}`)}
          className="text-gray-400 hover:text-gray-600 font-bold text-lg"
        >
          ✕
        </button>
        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full bg-[#58CC02] transition-all duration-500"
            style={{ width: `${((currentIdx + 1) / pageSlides.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-bold text-gray-500">
          Page {currentIdx + 1} of {pageSlides.length}
        </span>
      </div>

      {/* Split body */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* LEFT — PDF page viewer */}
        <div className="flex flex-col w-1/2 border-r border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50 flex-shrink-0">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wide">
              📄 {lesson.title}
            </span>
            <span className="text-xs font-bold text-gray-400">
              p.{current?.content.match(/Page (\d+)/)?.[1] ?? currentIdx + 1}
            </span>
          </div>

          {/* PDF iframe — fills remaining height */}
          <div className="flex-1 min-h-0 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0"
              >
                {current?.fileUrl ? (
                  <iframe
                    src={current.fileUrl}
                    className="w-full h-full border-0"
                    title={`Page ${currentIdx + 1}`}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 p-8">
                    <p className="font-semibold text-center leading-relaxed whitespace-pre-wrap">
                      {current?.content}
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
            <button
              onClick={() => setCurrentIdx((i) => i - 1)}
              disabled={currentIdx === 0}
              className="duo-btn-outline text-sm py-2 px-4 disabled:opacity-40"
            >
              ← Prev
            </button>

            {/* Page dots (up to 10 visible) */}
            <div className="flex-1 flex justify-center gap-1 overflow-hidden">
              {pageSlides.slice(
                Math.max(0, currentIdx - 4),
                Math.min(pageSlides.length, currentIdx + 6)
              ).map((_, relIdx) => {
                const absIdx = relIdx + Math.max(0, currentIdx - 4);
                return (
                  <button
                    key={absIdx}
                    onClick={() => setCurrentIdx(absIdx)}
                    className={`h-2 rounded-full transition-all ${
                      absIdx === currentIdx ? "bg-[#58CC02] w-6" : "bg-gray-300 w-2 hover:bg-gray-400"
                    }`}
                  />
                );
              })}
            </div>

            {isLast ? (
              <button
                onClick={complete}
                disabled={completing}
                className="duo-btn-green text-sm py-2 px-4 disabled:opacity-60"
              >
                {completing ? "…" : "Complete ✓"}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx((i) => i + 1)}
                className="duo-btn-green text-sm py-2 px-4"
              >
                Next →
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — Per-page summary */}
        <div className="flex flex-col w-1/2 overflow-hidden bg-[#f7f7f7]">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wide">
              📋 Page {current?.content.match(/Page (\d+)/)?.[1] ?? currentIdx + 1} — Summary
            </span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto px-5 py-4"
            >
              {summaryLines.length > 0 ? (
                <ul className="space-y-3">
                  {summaryLines.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#58CC02] text-white text-xs font-black flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-gray-700 font-medium text-sm leading-relaxed">{bullet}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm italic">No summary for this page.</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Standard slide viewer for regular lessons ───────────────────────────────

export default function SlideViewer({
  lesson,
  spotId,
  courseId,
}: {
  lesson: Lesson;
  spotId: string;
  courseId: string;
  unitId: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [completing, setCompleting] = useState(false);

  // Use split view if any slide is a PDF page
  const hasPdfPages = lesson.slides.some((s) => s.type === "pdf_page");
  if (hasPdfPages) {
    return <PdfSplitViewer lesson={lesson} spotId={spotId} courseId={courseId} />;
  }

  const slide = lesson.slides[current];
  const isLast = current === lesson.slides.length - 1;

  function goNext() { setDirection(1); setCurrent((c) => c + 1); }
  function goPrev() { setDirection(-1); setCurrent((c) => c - 1); }

  async function complete() {
    setCompleting(true);
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathSpotId: spotId }),
    });
    toast.success("Lesson complete! 🎉");
    router.push(`/learn/${courseId}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.push(`/learn/${courseId}`)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">
          ✕
        </button>
        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full bg-[#58CC02] transition-all duration-500"
            style={{ width: `${((current + 1) / lesson.slides.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-bold text-gray-500">{current + 1}/{lesson.slides.length}</span>
      </div>

      {/* Slide */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="duo-card p-8"
            >
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                {lesson.title} · Slide {current + 1}
              </p>
              {slide.imageUrl && (
                <img src={slide.imageUrl} alt="Slide visual" className="w-full rounded-xl mb-4 object-cover max-h-48" />
              )}
              <p className="text-gray-800 font-semibold text-lg leading-relaxed whitespace-pre-wrap">
                {slide.content}
              </p>
              {slide.audioUrl && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-gray-400 mb-1">Audio</p>
                  <audio controls className="w-full rounded-xl"><source src={slide.audioUrl} /></audio>
                </div>
              )}
              {slide.videoUrl && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-gray-400 mb-1">Video</p>
                  <video controls className="w-full rounded-xl max-h-64"><source src={slide.videoUrl} /></video>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3 mt-6">
            {current > 0 && <button onClick={goPrev} className="duo-btn-outline flex-1">← Back</button>}
            {isLast ? (
              <button onClick={complete} disabled={completing} className="duo-btn-green flex-1 disabled:opacity-60">
                {completing ? "Completing…" : "Complete Lesson ✓"}
              </button>
            ) : (
              <button onClick={goNext} className="duo-btn-green flex-1">Next →</button>
            )}
          </div>

          <div className="flex justify-center gap-2 mt-4">
            {lesson.slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-[#58CC02] w-6" : "bg-gray-300"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
