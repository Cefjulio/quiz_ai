"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface PdfPage {
  id: string;
  page_number: number;
  text_content: string;
  is_used: boolean;
  lesson_id: string | null;
  page_file_url: string | null;
}

interface PdfUpload {
  id: string;
  title: string;
  file_url: string;
  total_pages: number;
  course_id?: string | null;
}

interface Unit { id: string; title: string; }
interface Course { id: string; title: string; units: Unit[]; }

interface Props {
  pdf: PdfUpload;
  courses: Course[];
  onBack: () => void;
}

const PAGE_BATCH = 24;

export default function PdfPageGrid({ pdf, courses, onBack }: Props) {
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchStart, setBatchStart] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [targetCourseId, setTargetCourseId] = useState(pdf.course_id ?? courses[0]?.id ?? "");
  const [targetUnitId, setTargetUnitId] = useState("");
  const [creating, setCreating] = useState(false);
  const [previewPage, setPreviewPage] = useState<PdfPage | null>(null);

  const targetCourse = courses.find((c) => c.id === targetCourseId);
  const units = targetCourse?.units ?? [];

  useEffect(() => {
    if (units.length > 0 && !targetUnitId) setTargetUnitId(units[0].id);
  }, [targetCourseId, units, targetUnitId]);

  useEffect(() => {
    fetch(`/api/pdf-manager/${pdf.id}`)
      .then((r) => r.json())
      .then((data) => {
        setPages(data.pdf_pages ?? []);
        setLoading(false);
      });
  }, [pdf.id]);

  const visiblePages = pages.slice(batchStart, batchStart + PAGE_BATCH);
  const usedCount = pages.filter((p) => p.is_used).length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(visiblePages.filter((p) => !p.is_used).map((p) => p.id)));
  }
  function clearSelection() { setSelected(new Set()); }

  async function createLesson() {
    if (selected.size === 0) { toast.error("Select at least one page"); return; }
    if (!lessonTitle.trim()) { toast.error("Enter a lesson title"); return; }
    if (!targetUnitId) { toast.error("Select a unit"); return; }
    setCreating(true);
    const res = await fetch(`/api/pdf-manager/${pdf.id}/create-lesson`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageIds: Array.from(selected),
        lessonTitle: lessonTitle.trim(),
        unitId: targetUnitId,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
      return;
    }
    const result = await res.json();
    toast.success(`✅ Lesson + ${result.flashcardCount} flashcards added to pathway!`);
    setSelected(new Set());
    setShowCreate(false);
    setLessonTitle("");
    const updated = await fetch(`/api/pdf-manager/${pdf.id}`).then((r) => r.json());
    setPages(updated.pdf_pages ?? []);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 font-bold text-xl">←</button>
        <div className="flex-1">
          <h2 className="font-black text-xl text-gray-800">{pdf.title}</h2>
          <p className="text-sm text-gray-400">
            {pdf.total_pages} pages ·{" "}
            <span className="text-amber-500 font-bold">{usedCount} used</span> ·{" "}
            <span className="text-[#58CC02] font-bold">{pages.length - usedCount} available</span>
          </p>
        </div>
        {selected.size > 0 && (
          <button onClick={() => setShowCreate(true)} className="duo-btn-green text-sm px-5">
            ✨ Create Lesson & Flashcards ({selected.size} pages)
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs font-bold flex-wrap">
        <span className="flex items-center gap-1.5 text-gray-500">
          <span className="w-3 h-3 rounded border-2 border-gray-300 inline-block" /> Available
        </span>
        <span className="flex items-center gap-1.5 text-[#58CC02]">
          <span className="w-3 h-3 rounded border-2 border-[#58CC02] bg-[#58CC02] inline-block" /> Selected
        </span>
        <span className="flex items-center gap-1.5 text-amber-600">
          <span className="w-3 h-3 rounded bg-amber-200 inline-block" /> Already used in a lesson
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap bg-white rounded-2xl p-3 border border-gray-100">
        <button
          onClick={() => setBatchStart((b) => Math.max(0, b - PAGE_BATCH))}
          disabled={batchStart === 0}
          className="duo-btn-outline text-xs py-1 px-3 disabled:opacity-40"
        >
          ← Prev {PAGE_BATCH}
        </button>
        <span className="text-xs font-bold text-gray-500">
          Pages {batchStart + 1}–{Math.min(batchStart + PAGE_BATCH, pages.length)} of {pages.length}
        </span>
        <button
          onClick={() => setBatchStart((b) => Math.min(pages.length - 1, b + PAGE_BATCH))}
          disabled={batchStart + PAGE_BATCH >= pages.length}
          className="duo-btn-outline text-xs py-1 px-3 disabled:opacity-40"
        >
          Next {PAGE_BATCH} →
        </button>
        <div className="flex-1" />
        <button onClick={selectAllVisible} className="text-xs text-[#1CB0F6] font-bold hover:underline">Select all visible</button>
        <button onClick={clearSelection} className="text-xs text-gray-400 font-bold hover:underline">Clear</button>
      </div>

      {/* Page grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 font-bold">Loading pages…</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {visiblePages.map((page) => {
            const isSelected = selected.has(page.id);
            return (
              <div
                key={page.id}
                onClick={() => !page.is_used && toggleSelect(page.id)}
                className={`relative rounded-2xl border-2 transition-all select-none flex flex-col
                  ${page.is_used
                    ? "border-amber-200 bg-amber-50 opacity-70 cursor-default"
                    : isSelected
                    ? "border-[#58CC02] bg-[#f0fdf4] cursor-pointer ring-2 ring-[#58CC02]/20"
                    : "border-gray-200 bg-white hover:border-gray-400 cursor-pointer"
                  }`}
              >
                {/* Page number header */}
                <div className={`px-2 py-1.5 rounded-t-xl flex items-center justify-between ${isSelected ? "bg-[#58CC02]" : page.is_used ? "bg-amber-200" : "bg-gray-100"}`}>
                  <span className={`text-xs font-black ${isSelected ? "text-white" : "text-gray-600"}`}>
                    p.{page.page_number}
                  </span>
                  {isSelected && <span className="text-white text-xs">✓</span>}
                  {page.is_used && <span className="text-amber-700 text-[10px] font-black">Used</span>}
                </div>

                {/* Text preview */}
                <div className="p-2 flex-1">
                  <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-5">
                    {page.text_content || <span className="italic text-gray-300">No text</span>}
                  </p>
                </div>

                {/* Preview button */}
                <button
                  onClick={(e) => { e.stopPropagation(); setPreviewPage(page); }}
                  className="mx-2 mb-2 text-[10px] text-[#1CB0F6] font-bold hover:underline text-left"
                >
                  👁 View page
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Page preview modal — shows the individual single-page PDF */}
      {previewPage && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl flex flex-col overflow-hidden shadow-2xl" style={{ height: "85vh" }}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-black text-gray-800">{pdf.title} — Page {previewPage.page_number}</h3>
                {previewPage.is_used && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full ml-2">Already used in a lesson</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!previewPage.is_used && (
                  <button
                    onClick={() => { toggleSelect(previewPage.id); setPreviewPage(null); }}
                    className={`text-xs font-bold px-3 py-1 rounded-xl ${selected.has(previewPage.id) ? "bg-gray-200 text-gray-600" : "bg-[#58CC02] text-white"}`}
                  >
                    {selected.has(previewPage.id) ? "Deselect" : "Select this page"}
                  </button>
                )}
                <button onClick={() => setPreviewPage(null)} className="text-gray-400 text-xl">✕</button>
              </div>
            </div>
            {previewPage.page_file_url ? (
              <iframe
                src={previewPage.page_file_url}
                className="flex-1 w-full border-0"
                title={`Page ${previewPage.page_number}`}
              />
            ) : (
              <div className="flex-1 overflow-y-auto p-6">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-3">Extracted text</p>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {previewPage.text_content || "No text content on this page."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create lesson & flashcards modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-black text-lg text-gray-800">✨ Create Lesson & Flashcards</h3>
            <p className="text-sm text-gray-500">
              AI will summarize <strong>{selected.size} selected pages</strong> into a lesson with a
              bullet-point summary and generate flashcards for the key concepts.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Lesson Title</label>
              <input
                autoFocus
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 font-semibold focus:border-[#58CC02] focus:outline-none text-sm"
                placeholder="e.g. Chapter 1 – Introduction"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Course</label>
              <select
                value={targetCourseId}
                onChange={(e) => { setTargetCourseId(e.target.value); setTargetUnitId(""); }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 font-semibold focus:border-[#58CC02] focus:outline-none text-sm"
              >
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Unit</label>
              <select
                value={targetUnitId}
                onChange={(e) => setTargetUnitId(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 font-semibold focus:border-[#58CC02] focus:outline-none text-sm"
              >
                {units.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}
              </select>
              {units.length === 0 && (
                <p className="text-xs text-red-500 mt-1">This course has no units. Create a unit first.</p>
              )}
            </div>

            {creating && (
              <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-700 font-semibold text-center animate-pulse">
                ✨ AI is generating lesson summary and flashcards…
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} disabled={creating} className="duo-btn-outline flex-1 text-sm">Cancel</button>
              <button onClick={createLesson} disabled={creating || !targetUnitId} className="duo-btn-green flex-1 text-sm disabled:opacity-60">
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
