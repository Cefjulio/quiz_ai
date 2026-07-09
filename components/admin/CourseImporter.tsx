"use client";
import { useState, useRef } from "react";
import toast from "react-hot-toast";

interface ParsedVideo {
  title: string;
  transcript: string;
  order: number;
}

interface ParsedSection {
  title: string;
  order: number;
  videos: ParsedVideo[];
  unitId: string;
}

interface ParseResult {
  sections: ParsedSection[];
  totalVideos: number;
}

interface Course {
  id: string;
  title: string;
}

type Status = "idle" | "parsing" | "preview" | "importing" | "done";

interface BatchResult {
  videoTitle: string;
  lessonId?: string;
  quizId?: string;
  flashcardCount?: number;
  error?: string;
}

const BATCH_SIZE = 1; // 1 video per request to stay within Vercel's 10-60s function limit

export default function CourseImporter({ courses }: { courses: Course[] }) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [processedCount, setProcessedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [currentVideoTitle, setCurrentVideoTitle] = useState("");
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const abortRef = useRef(false);
  // Per-video transcript editing in the preview step
  const [editingVideo, setEditingVideo] = useState<{ sectionOrder: number; videoOrder: number } | null>(null);

  async function handleParse() {
    if (!file || !courseId) { toast.error("Select a course and a PDF file"); return; }
    setStatus("parsing");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("courseId", courseId);
    try {
      const res = await fetch("/api/course-import/parse", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Parse failed");
        setStatus("idle");
        return;
      }
      const data: ParseResult = await res.json();
      setParseResult(data);
      setStatus("preview");
    } catch {
      toast.error("Network error — try again");
      setStatus("idle");
    }
  }

  async function handleImport() {
    if (!parseResult) return;
    setStatus("importing");
    setProcessedCount(0);
    setErrorCount(0);
    setBatchResults([]);
    abortRef.current = false;

    const queue: {
      title: string;
      transcript: string;
      unitId: string;
      lessonOrder: number;
      quizOrder: number;
    }[] = [];
    let globalIdx = 0;
    for (const section of parseResult.sections) {
      for (const video of section.videos) {
        const base = globalIdx * 2;
        queue.push({
          title: video.title,
          transcript: video.transcript,
          unitId: section.unitId,
          lessonOrder: base + 1,
          quizOrder: base + 2,
        });
        globalIdx++;
      }
    }

    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      if (abortRef.current) break;
      const batch = queue.slice(i, i + BATCH_SIZE);
      setCurrentVideoTitle(batch[0].title);

      try {
        const res = await fetch("/api/course-import/process-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videos: batch }),
        });

        if (!res.ok) {
          let serverError = "Server error — request timed out or failed";
          try {
            const errBody = await res.json();
            serverError = errBody.error ?? serverError;
          } catch { /* ignore */ }
          const failedResults: BatchResult[] = batch.map((v) => ({
            videoTitle: v.title,
            error: serverError,
          }));
          setBatchResults((prev) => [...prev, ...failedResults]);
          setErrorCount((c) => c + batch.length);
          setProcessedCount((c) => c + batch.length);
          continue;
        }

        const { results }: { results: BatchResult[] } = await res.json();
        setBatchResults((prev) => [...prev, ...results]);
        const errors = results.filter((r) => r.error).length;
        setErrorCount((c) => c + errors);
        setProcessedCount((c) => c + results.length);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        const failedResults: BatchResult[] = batch.map((v) => ({
          videoTitle: v.title,
          error: msg,
        }));
        setBatchResults((prev) => [...prev, ...failedResults]);
        setErrorCount((c) => c + batch.length);
        setProcessedCount((c) => c + batch.length);
      }
    }

    setStatus("done");
  }

  function updateVideoTranscript(sectionOrder: number, videoOrder: number, newTranscript: string) {
    setParseResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) =>
          s.order !== sectionOrder ? s : {
            ...s,
            videos: s.videos.map((v) =>
              v.order !== videoOrder ? v : { ...v, transcript: newTranscript }
            ),
          }
        ),
      };
    });
  }

  function toggleSection(order: number) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(order)) next.delete(order); else next.add(order);
      return next;
    });
  }

  const progress = parseResult && parseResult.totalVideos > 0
    ? Math.round((processedCount / parseResult.totalVideos) * 100)
    : 0;
  const estMinutes = parseResult
    ? Math.ceil((parseResult.totalVideos - processedCount) * 7 / 60)
    : 0;

  // ── Done ────────────────────────────────────────────────────────────────────
  if (status === "done") {
    const succeeded = batchResults.filter((r) => !r.error).length;
    const failed = batchResults.filter((r) => r.error).length;
    return (
      <div className="duo-card p-8 text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-black text-gray-800">Import Complete!</h2>
        <p className="text-gray-600">
          Created <strong>{succeeded}</strong> lesson + flashcard quiz pair{succeeded !== 1 ? "s" : ""}.
          {failed > 0 && <span className="text-red-500 ml-2">{failed} video{failed > 1 ? "s" : ""} skipped due to errors.</span>}
        </p>

        {failed > 0 && (
          <div className="text-left bg-red-50 border border-red-100 rounded-xl p-4 space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs font-black text-red-600 uppercase tracking-wide mb-1">Skipped Videos — Error Details:</p>
            {batchResults.filter((r) => r.error).map((r, i) => (
              <div key={i} className="text-xs leading-relaxed">
                <p className="font-bold text-red-700">📹 {r.videoTitle}</p>
                <p className="text-red-500 mt-0.5 pl-4">↳ {r.error}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setStatus("idle"); setFile(null); setParseResult(null); setBatchResults([]); }}
            className="duo-btn-outline"
          >
            Import Another
          </button>
          <a href="/admin/courses" className="duo-btn-green">
            View Courses →
          </a>
        </div>
      </div>
    );
  }

  // ── Importing ────────────────────────────────────────────────────────────────
  if (status === "importing") {
    return (
      <div className="duo-card p-8 space-y-6">
        <h2 className="text-xl font-black text-gray-800">Importing Course...</h2>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-600">
              {processedCount} / {parseResult?.totalVideos} videos processed
            </span>
            <span className="text-sm font-bold text-[#58CC02]">{progress}%</span>
          </div>
          <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="h-4 rounded-full bg-[#58CC02] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {estMinutes > 0 && (
            <p className="text-xs text-gray-400 mt-1 text-right">~{estMinutes} min remaining</p>
          )}
        </div>
        {currentVideoTitle && (
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 animate-pulse">
            <p className="text-xs font-bold text-purple-500 uppercase tracking-wide mb-1">Processing</p>
            <p className="text-sm font-semibold text-purple-800 truncate">📹 {currentVideoTitle}</p>
          </div>
        )}
        {errorCount > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
            <p className="text-xs font-black text-red-600 uppercase tracking-wide">
              {errorCount} video{errorCount > 1 ? "s" : ""} skipped — errors:
            </p>
            {batchResults
              .filter((r) => r.error)
              .map((r, i) => (
                <div key={i} className="text-xs text-red-700 leading-relaxed">
                  <span className="font-bold">📹 {r.videoTitle}:</span>{" "}
                  <span className="text-red-500">{r.error}</span>
                </div>
              ))}
          </div>
        )}
        <p className="text-xs text-gray-400 text-center">
          Keep this page open while importing. Do not close or refresh the browser.
        </p>
      </div>
    );
  }

  // ── Preview ──────────────────────────────────────────────────────────────────
  if (status === "preview" && parseResult) {
    const totalVideos = parseResult.totalVideos;
    const estMin = Math.ceil(totalVideos * 7 / 60);
    const allVideos = parseResult.sections.flatMap((s) => s.videos);
    const shortVideos = allVideos.filter((v) => v.transcript.length < 300);
    return (
      <div className="space-y-4">
        <div className="duo-card p-5">
          <h2 className="text-xl font-black text-gray-800 mb-1">📊 Structure Preview</h2>
          <p className="text-sm text-gray-600">
            Found <strong>{parseResult.sections.length} sections</strong> and{" "}
            <strong>{totalVideos} videos</strong>. Import will create{" "}
            <strong>{totalVideos * 2} pathway spots</strong> (1 lesson + 1 flashcard deck per video).
          </p>
          <p className="text-xs text-amber-600 font-bold mt-2 bg-amber-50 rounded-lg px-3 py-2">
            ⏱ Estimated time: ~{estMin} minutes — AI generates one lesson at a time
          </p>
          {shortVideos.length > 0 && (
            <div className="mt-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs font-black text-red-600 uppercase tracking-wide">
                ⚠ {shortVideos.length} video{shortVideos.length > 1 ? "s have" : " has"} a very short transcript — may be incomplete
              </p>
              {shortVideos.map((v) => (
                <p key={v.order} className="text-xs text-red-500">
                  · {v.title} <span className="text-red-400">({v.transcript.length} chars)</span>
                </p>
              ))}
              <p className="text-xs text-red-400 mt-1">Expand the section below and click <strong>✏️ Edit</strong> to paste in the missing transcript before importing.</p>
            </div>
          )}
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {parseResult.sections.map((section) => (
            <div key={section.order} className="duo-card overflow-hidden">
              <button
                onClick={() => toggleSection(section.order)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📚</span>
                  <div>
                    <p className="font-black text-gray-800 text-sm">{section.title}</p>
                    <p className="text-xs text-gray-400">{section.videos.length} videos</p>
                  </div>
                </div>
                <span className="text-gray-400 text-sm">{expandedSections.has(section.order) ? "▲" : "▼"}</span>
              </button>
              {expandedSections.has(section.order) && (
                <div className="border-t border-gray-100 divide-y divide-gray-50 bg-gray-50/50">
                  {section.videos.map((video) => {
                    const chars = video.transcript.length;
                    const isEditing = editingVideo?.sectionOrder === section.order && editingVideo?.videoOrder === video.order;
                    const charColor = chars < 300 ? "text-red-500" : chars < 800 ? "text-amber-500" : "text-green-600";
                    const charLabel = chars < 300 ? "⚠ Very short" : chars < 800 ? "~ Short" : "✓ Good";
                    return (
                      <div key={video.order} className="px-4 py-3 space-y-2">
                        <div className="flex items-start gap-3">
                          <span className="text-gray-300 text-xs w-6 flex-shrink-0 pt-0.5">{video.order}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-700">📹 {video.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs font-bold ${charColor}`}>{charLabel} · {chars.toLocaleString()} chars</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingVideo(isEditing ? null : { sectionOrder: section.order, videoOrder: video.order })}
                            className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 transition-colors ${isEditing ? "bg-gray-200 text-gray-600" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                          >
                            {isEditing ? "▲ Close" : "✏️ Edit"}
                          </button>
                        </div>

                        {isEditing ? (
                          <div className="ml-9 space-y-2">
                            <p className="text-xs text-gray-400 font-semibold">
                              Edit transcript below — paste missing content, then close. Changes apply at import time.
                            </p>
                            <textarea
                              value={video.transcript}
                              onChange={(e) => updateVideoTranscript(section.order, video.order, e.target.value)}
                              rows={10}
                              className="w-full border-2 border-amber-200 focus:border-[#58CC02] focus:outline-none rounded-xl px-3 py-2 text-xs font-mono leading-relaxed resize-y"
                              placeholder="Paste the full transcript here…"
                            />
                            <p className="text-xs text-gray-400 text-right">{video.transcript.length.toLocaleString()} chars</p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 ml-9 line-clamp-2">{video.transcript.slice(0, 200)}{chars > 200 ? "…" : ""}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => setStatus("idle")} className="duo-btn-outline flex-1">← Back</button>
          <button onClick={handleImport} className="duo-btn-green flex-1">
            🚀 Start Import ({totalVideos} videos)
          </button>
        </div>
      </div>
    );
  }

  // ── Idle / upload form ───────────────────────────────────────────────────────
  return (
    <div className="duo-card p-6 space-y-5">
      <div>
        <h2 className="text-xl font-black text-gray-800 mb-1">📥 Batch Course Import</h2>
        <p className="text-sm text-gray-500">
          Upload a structured PDF to auto-create all units, lessons, and flashcard quizzes at once.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-600 space-y-1.5">
        <p className="font-black text-gray-700 mb-2">PDF Format Requirements:</p>
        <p>
          <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono">{"=== Section Name ==="}</code>
          <span className="ml-2">→ creates a Unit</span>
        </p>
        <p>
          <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono">{"--- Video Title ---"}</code>
          <span className="ml-2">→ creates Lesson + Flashcard Quiz</span>
        </p>
        <p className="text-gray-400 mt-1">Text between video markers becomes the lesson content</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
          Target Course
        </label>
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 font-semibold focus:border-[#58CC02] focus:outline-none text-sm"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
          Course PDF
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#58CC02] file:text-white hover:file:bg-[#46a302] file:cursor-pointer cursor-pointer"
        />
        {file && (
          <p className="text-xs text-gray-400 mt-1.5">
            {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>
        )}
      </div>

      {status === "parsing" && (
        <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 font-semibold text-center animate-pulse">
          📖 Analyzing PDF structure…
        </div>
      )}

      <button
        onClick={handleParse}
        disabled={!file || !courseId || status === "parsing"}
        className="duo-btn-green w-full disabled:opacity-60"
      >
        {status === "parsing" ? "Analyzing…" : "Analyze PDF →"}
      </button>
    </div>
  );
}
