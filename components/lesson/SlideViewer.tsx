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
  summary?: string[];
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
  const [mobileTab, setMobileTab] = useState<"pdf" | "summary">("pdf");

  const pageSlides = lesson.slides.filter((s) => s.type === "pdf_page");
  const current = pageSlides[currentIdx];
  const isLast = currentIdx === pageSlides.length - 1;
  const summaryLines: string[] = current?.summary ?? [];
  const pageLabel = current?.content.match(/Page (\d+)/)?.[1] ?? String(currentIdx + 1);

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

  const navBar = (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 bg-white flex-shrink-0">
      <button
        onClick={() => setCurrentIdx((i) => i - 1)}
        disabled={currentIdx === 0}
        className="duo-btn-outline text-xs py-1.5 px-3 disabled:opacity-40"
      >
        ← Prev
      </button>
      <div className="flex-1 flex justify-center gap-1 overflow-hidden">
        {pageSlides.slice(Math.max(0, currentIdx - 4), Math.min(pageSlides.length, currentIdx + 6)).map((_, rel) => {
          const abs = rel + Math.max(0, currentIdx - 4);
          return (
            <button key={abs} onClick={() => setCurrentIdx(abs)}
              className={`h-2 rounded-full transition-all ${abs === currentIdx ? "bg-[#58CC02] w-5" : "bg-gray-300 w-2"}`} />
          );
        })}
      </div>
      {isLast ? (
        <button onClick={complete} disabled={completing} className="duo-btn-green text-xs py-1.5 px-3 disabled:opacity-60">
          {completing ? "…" : "Complete ✓"}
        </button>
      ) : (
        <button onClick={() => setCurrentIdx((i) => i + 1)} className="duo-btn-green text-xs py-1.5 px-3">
          Next →
        </button>
      )}
    </div>
  );

  return (
    <div className="h-[100dvh] bg-[#f7f7f7] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => router.push(`/learn/${courseId}`)} className="text-gray-400 hover:text-gray-600 font-bold text-lg flex-shrink-0">✕</button>
        <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div className="h-2.5 rounded-full bg-[#58CC02] transition-all duration-500"
            style={{ width: `${((currentIdx + 1) / pageSlides.length) * 100}%` }} />
        </div>
        <span className="text-xs font-bold text-gray-500 flex-shrink-0">{currentIdx + 1}/{pageSlides.length}</span>
      </div>

      {/* Mobile tab switcher */}
      <div className="md:hidden bg-white border-b border-gray-100 flex flex-shrink-0">
        <button
          onClick={() => setMobileTab("pdf")}
          className={`flex-1 py-2 text-xs font-black uppercase tracking-wide border-b-2 transition-colors ${mobileTab === "pdf" ? "border-[#58CC02] text-[#58CC02]" : "border-transparent text-gray-400"}`}
        >
          📄 PDF
        </button>
        <button
          onClick={() => setMobileTab("summary")}
          className={`flex-1 py-2 text-xs font-black uppercase tracking-wide border-b-2 transition-colors ${mobileTab === "summary" ? "border-[#58CC02] text-[#58CC02]" : "border-transparent text-gray-400"}`}
        >
          📋 Summary
        </button>
      </div>

      {/* Body — side-by-side on md+, tabbed on mobile */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* LEFT — PDF */}
        <div className={`flex flex-col bg-white overflow-hidden md:w-1/2 md:border-r border-gray-200 ${mobileTab === "pdf" ? "flex-1" : "hidden md:flex"}`}>
          <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wide truncate">📄 {lesson.title}</span>
            <span className="text-xs font-bold text-gray-400 flex-shrink-0 ml-2">p.{pageLabel}</span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <AnimatePresence mode="wait">
              <motion.div key={currentIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }} className="absolute inset-0">
                {current?.fileUrl ? (
                  <iframe src={current.fileUrl} className="w-full h-full border-0" title={`Page ${currentIdx + 1}`} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 p-6">
                    <p className="font-semibold text-center leading-relaxed whitespace-pre-wrap text-sm">{current?.content}</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          {navBar}
        </div>

        {/* RIGHT — Summary */}
        <div className={`flex flex-col bg-[#f7f7f7] overflow-hidden md:w-1/2 ${mobileTab === "summary" ? "flex-1" : "hidden md:flex"}`}>
          <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wide">📋 Page {pageLabel} — Summary</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto px-4 py-4">
              {summaryLines.length > 0 ? (
                <ul className="space-y-3">
                  {summaryLines.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#58CC02] text-white text-xs font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                      <p className="text-gray-700 font-medium text-sm leading-relaxed">{bullet}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm italic">No summary for this page.</p>
              )}
            </motion.div>
          </AnimatePresence>
          {/* Nav also shown on mobile summary tab */}
          <div className="md:hidden">{navBar}</div>
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
    <div className="min-h-[100dvh] bg-[#f7f7f7] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-3">
        <button onClick={() => router.push(`/learn/${courseId}`)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
        <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div className="h-2.5 rounded-full bg-[#58CC02] transition-all duration-500"
            style={{ width: `${((current + 1) / lesson.slides.length) * 100}%` }} />
        </div>
        <span className="text-sm font-bold text-gray-500">{current + 1}/{lesson.slides.length}</span>
      </div>

      {/* Slide */}
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={current} custom={direction}
              initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="duo-card p-5 sm:p-8">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                {lesson.title} · Slide {current + 1}
              </p>
              {slide.imageUrl && (
                <img src={slide.imageUrl} alt="Slide visual" className="w-full rounded-xl mb-4 object-cover max-h-48" />
              )}
              <p className="text-gray-800 font-semibold text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
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

          <div className="flex gap-3 mt-4">
            {current > 0 && <button onClick={goPrev} className="duo-btn-outline flex-1 text-sm">← Back</button>}
            {isLast ? (
              <button onClick={complete} disabled={completing} className="duo-btn-green flex-1 text-sm disabled:opacity-60">
                {completing ? "Completing…" : "Complete Lesson ✓"}
              </button>
            ) : (
              <button onClick={goNext} className="duo-btn-green flex-1 text-sm">Next →</button>
            )}
          </div>

          <div className="flex justify-center gap-2 mt-3 flex-wrap">
            {lesson.slides.map((_, i) => (
              <button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                className={`h-2 rounded-full transition-all ${i === current ? "bg-[#58CC02] w-6" : "bg-gray-300 w-2"}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
