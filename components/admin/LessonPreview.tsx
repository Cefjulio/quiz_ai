"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Slide {
  type: string;
  content: string;
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  fileUrl?: string;
  summary?: string[];
}

interface Props {
  title: string;
  slides: Slide[];
  fileUrl?: string | null;
  fileExt?: string | null;
  onClose: () => void;
}

// ─── Split preview for PDF-page lessons ──────────────────────────────────────

function PdfSplitPreview({ title, slides, onClose }: { title: string; slides: Slide[]; onClose: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const pageSlides = slides.filter((s) => s.type === "pdf_page");
  const current = pageSlides[currentIdx];
  const summaryLines: string[] = current?.summary ?? [];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full bg-[#58CC02] transition-all duration-500"
            style={{ width: `${((currentIdx + 1) / pageSlides.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-bold text-gray-500">p.{currentIdx + 1}/{pageSlides.length}</span>
        <span className="text-xs font-black text-[#58CC02] uppercase tracking-wide">Preview</span>
      </div>

      {/* Split body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT — PDF page */}
        <div className="flex flex-col w-1/2 border-r border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wide">📄 {title}</span>
            <span className="text-xs font-bold text-gray-400">
              p.{current?.content.match(/Page (\d+)/)?.[1] ?? currentIdx + 1}
            </span>
          </div>
          <div className="flex-1 min-h-0">
            {current?.fileUrl ? (
              <iframe src={current.fileUrl} className="w-full h-full border-0" title={`Page ${currentIdx + 1}`} />
            ) : (
              <div className="flex items-center justify-center h-full p-6 text-gray-500 text-sm whitespace-pre-wrap">
                {current?.content}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 flex-shrink-0">
            <button onClick={() => setCurrentIdx((i) => i - 1)} disabled={currentIdx === 0}
              className="duo-btn-outline text-xs py-1.5 px-3 disabled:opacity-40">← Prev</button>
            <div className="flex-1 flex justify-center gap-1">
              {pageSlides.slice(Math.max(0, currentIdx - 4), Math.min(pageSlides.length, currentIdx + 6)).map((_, rel) => {
                const abs = rel + Math.max(0, currentIdx - 4);
                return <button key={abs} onClick={() => setCurrentIdx(abs)}
                  className={`h-1.5 rounded-full transition-all ${abs === currentIdx ? "bg-[#58CC02] w-5" : "bg-gray-300 w-1.5"}`} />;
              })}
            </div>
            {currentIdx === pageSlides.length - 1 ? (
              <button onClick={onClose} className="duo-btn-green text-xs py-1.5 px-3">Done ✓</button>
            ) : (
              <button onClick={() => setCurrentIdx((i) => i + 1)} className="duo-btn-green text-xs py-1.5 px-3">Next →</button>
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
          <div key={currentIdx} className="flex-1 overflow-y-auto px-5 py-4">
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
          </div>
        </div>
      </div>
    </div>
  );
}

type ViewMode = "file" | "slides";

export default function LessonPreview({ title, slides, fileUrl, fileExt, onClose }: Props) {
  const hasPdfPages = slides.some((s) => s.type === "pdf_page");

  // PDF-page lessons get the split view
  if (hasPdfPages) {
    return <PdfSplitPreview title={title} slides={slides} onClose={onClose} />;
  }

  const hasPdf = !!fileUrl && fileExt === "pdf";
  const hasPptx = !!fileUrl && (fileExt === "pptx" || fileExt === "ppt");
  const hasFile = hasPdf || hasPptx;

  const [viewMode, setViewMode] = useState<ViewMode>(hasFile ? "file" : "slides");
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  function goNext() { setDirection(1); setCurrent((c) => c + 1); }
  function goPrev() { setDirection(-1); setCurrent((c) => c - 1); }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#f7f7f7] rounded-2xl w-full max-w-3xl flex flex-col overflow-hidden shadow-2xl"
        style={{ height: hasPdf ? "90vh" : "auto", maxHeight: "90vh" }}>

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
          <p className="font-black text-gray-700 flex-1 truncate">{title}</p>
          <span className="text-xs font-black text-[#58CC02] uppercase tracking-wide">Preview</span>
        </div>

        {/* Tab bar — only shown when a file exists */}
        {hasFile && (
          <div className="bg-white border-b border-gray-100 px-4 flex gap-1 flex-shrink-0">
            <button
              onClick={() => setViewMode("file")}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wide border-b-2 transition-colors ${
                viewMode === "file"
                  ? "border-[#58CC02] text-[#58CC02]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {hasPdf ? "📄 PDF" : "📊 Slides file"}
            </button>
            <button
              onClick={() => setViewMode("slides")}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wide border-b-2 transition-colors ${
                viewMode === "slides"
                  ? "border-[#58CC02] text-[#58CC02]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              📝 Extracted text
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">

          {/* PDF viewer */}
          {viewMode === "file" && hasPdf && (
            <iframe
              src={fileUrl!}
              className="w-full flex-1 border-0"
              title={title}
            />
          )}

          {/* PPTX — browsers can't render natively, offer download */}
          {viewMode === "file" && hasPptx && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
              <div className="text-6xl">📊</div>
              <p className="font-black text-gray-700 text-lg">{title}</p>
              <p className="text-gray-500 text-sm max-w-sm">
                PowerPoint files cannot be displayed directly in the browser.
                Download the file to open it in PowerPoint or Google Slides, or
                switch to <strong>Extracted text</strong> to preview the slide content.
              </p>
              <a
                href={fileUrl!}
                download
                className="duo-btn-green px-8 py-3 no-underline"
              >
                ⬇ Download {fileExt?.toUpperCase()}
              </a>
            </div>
          )}

          {/* Slide text viewer */}
          {viewMode === "slides" && (
            <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 py-6">
              <div className="w-full max-w-xl">
                {/* Progress bar */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-[#58CC02] transition-all duration-500"
                      style={{ width: `${((current + 1) / slides.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-400 whitespace-nowrap">
                    {current + 1} / {slides.length}
                  </span>
                </div>

                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={current}
                    custom={direction}
                    initial={{ x: direction > 0 ? 200 : -200, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: direction > 0 ? -200 : 200, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="duo-card p-6"
                  >
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                      {title} · Slide {current + 1}
                    </p>

                    {slide.type === "pdf_page" && slide.fileUrl ? (
                      <iframe
                        src={slide.fileUrl}
                        className="w-full rounded-xl border-0 mb-2"
                        style={{ height: "52vh" }}
                        title={slide.content.split("\n")[0]}
                      />
                    ) : (
                      <>
                        {slide.imageUrl && (
                          <img src={slide.imageUrl} alt="Slide visual"
                            className="w-full rounded-xl mb-4 object-cover max-h-48" />
                        )}
                        <p className="text-gray-800 font-semibold text-base leading-relaxed whitespace-pre-wrap">
                          {slide.content}
                        </p>
                      </>
                    )}

                    {slide.audioUrl && (
                      <div className="mt-4">
                        <p className="text-xs font-bold text-gray-400 mb-1">Audio</p>
                        <audio controls className="w-full rounded-xl">
                          <source src={slide.audioUrl} />
                        </audio>
                      </div>
                    )}

                    {slide.videoUrl && (
                      <div className="mt-4">
                        <p className="text-xs font-bold text-gray-400 mb-1">Video</p>
                        <video controls className="w-full rounded-xl max-h-48">
                          <source src={slide.videoUrl} />
                        </video>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex gap-3 mt-4">
                  {current > 0 ? (
                    <button onClick={goPrev} className="duo-btn-outline flex-1">← Back</button>
                  ) : (
                    <div className="flex-1" />
                  )}
                  {isLast ? (
                    <button onClick={onClose} className="duo-btn-green flex-1">Done ✓</button>
                  ) : (
                    <button onClick={goNext} className="duo-btn-green flex-1">Next →</button>
                  )}
                </div>

                {slides.length > 1 && (
                  <div className="flex justify-center gap-2 mt-3">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                        className={`h-2 rounded-full transition-all ${
                          i === current ? "bg-[#58CC02] w-6" : "bg-gray-300 w-2"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
