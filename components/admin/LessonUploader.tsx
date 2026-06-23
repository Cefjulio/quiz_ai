"use client";
import { useState, useRef } from "react";
import toast from "react-hot-toast";

interface Slide {
  type: string;
  content: string;
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
}

export default function LessonUploader({
  unitId,
  lessonId,
  initialTitle,
  initialSlides,
  onClose,
  onDone,
}: {
  unitId: string;
  lessonId?: string;       // present = edit mode
  initialTitle?: string;
  initialSlides?: Slide[];
  onClose: () => void;
  onDone: () => void;
}) {
  const isEdit = !!lessonId;
  const [step, setStep] = useState<"upload" | "edit">(isEdit ? "edit" : "upload");
  const [title, setTitle] = useState(initialTitle || "");
  const [slides, setSlides] = useState<Slide[]>(initialSlides || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileExt, setFileExt] = useState<string | null>(null);
  const [plainText, setPlainText] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) { toast.error("Upload failed"); return; }
    const { slides: parsedSlides, fileUrl: url, ext } = await res.json();
    setSlides(parsedSlides);
    setFileUrl(url ?? null);
    setFileExt(ext ?? null);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    setStep("edit");
  }

  function handleTextContinue() {
    if (!plainText.trim()) return;
    const chunks = plainText.split(/\n{2,}/).map((s) => s.trim()).filter((s) => s.length > 0);
    setSlides((chunks.length > 0 ? chunks : [plainText]).map((content) => ({ type: "text", content })));
    setStep("edit");
  }

  function updateSlide(i: number, field: keyof Slide, value: string) {
    setSlides((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  function addSlide() {
    setSlides((prev) => [...prev, { type: "text", content: "" }]);
  }

  function removeSlide(i: number) {
    setSlides((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function saveLesson() {
    if (!title.trim()) { toast.error("Add a lesson title"); return; }
    setSaving(true);

    if (isEdit) {
      // Update existing lesson
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slides, fileUrl, fileExt }),
      });
      setSaving(false);
      if (!res.ok) { toast.error("Failed to update lesson"); return; }
      toast.success("Lesson updated!");
    } else {
      // Create new lesson + spot
      const lessonRes = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slides, fileUrl, fileExt }),
      });
      if (!lessonRes.ok) { setSaving(false); toast.error("Failed to save lesson"); return; }
      const lesson = await lessonRes.json();
      await fetch("/api/spots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, type: "LESSON", lessonId: lesson.id }),
      });
      setSaving(false);
      toast.success("Lesson added!");
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-800">
            {isEdit ? "✏️ Edit Lesson" : step === "upload" ? "📖 Add Lesson" : "Edit Slides"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>

        <div className="p-6">
          {step === "upload" ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                {["file", "text"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setInputMode(m as "file" | "text")}
                    className={`flex-1 py-2 rounded-xl font-bold text-sm transition ${
                      inputMode === m ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {m === "file" ? "📎 Upload File" : "✍️ Plain Text"}
                  </button>
                ))}
              </div>

              {inputMode === "file" ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-[#58CC02] transition"
                >
                  <div className="text-4xl mb-3">📄</div>
                  <p className="font-bold text-gray-600 mb-1">Click to upload</p>
                  <p className="text-sm text-gray-400">PDF, PPTX, or TXT</p>
                  <input ref={fileRef} type="file" accept=".pdf,.pptx,.ppt,.txt,.md" className="hidden" onChange={handleFileUpload} />
                  {uploading && <p className="mt-3 text-[#58CC02] font-bold">Uploading & parsing…</p>}
                </div>
              ) : (
                <div>
                  <textarea
                    value={plainText}
                    onChange={(e) => setPlainText(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium focus:border-[#58CC02] focus:outline-none text-sm resize-none"
                    rows={10}
                    placeholder="Paste your lesson content here. Use double line breaks to separate slides."
                  />
                  <button onClick={handleTextContinue} disabled={!plainText.trim()} className="duo-btn-green w-full mt-3 disabled:opacity-50">
                    Continue →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Lesson Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 font-semibold focus:border-[#58CC02] focus:outline-none text-sm"
                  placeholder="Lesson title"
                />
              </div>

              {!isEdit && (
                <button onClick={() => setStep("upload")} className="text-xs text-[#1CB0F6] font-bold hover:underline">
                  ← Replace slides from file
                </button>
              )}

              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Slides ({slides.length})</p>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {slides.map((slide, i) => (
                  <div key={i} className="border-2 border-gray-100 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gray-400 uppercase">Slide {i + 1}</span>
                      <button onClick={() => removeSlide(i)} className="text-red-400 text-xs font-bold hover:text-red-600">Remove</button>
                    </div>
                    <textarea
                      value={slide.content}
                      onChange={(e) => updateSlide(i, "content", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:border-[#58CC02] focus:outline-none resize-none"
                      rows={3}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {(["audioUrl", "videoUrl", "imageUrl"] as const).map((field) => (
                        <div key={field}>
                          <label className="text-xs text-gray-400 font-bold capitalize">{field.replace("Url", "")} URL (optional)</label>
                          <input
                            value={slide[field] || ""}
                            onChange={(e) => updateSlide(i, field, e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#58CC02]"
                            placeholder="https://…"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addSlide}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 font-bold text-sm hover:border-[#58CC02] hover:text-[#58CC02] transition"
              >
                + Add Slide
              </button>

              <div className="flex gap-3 pt-2">
                {!isEdit && (
                  <button onClick={() => setStep("upload")} className="duo-btn-outline flex-1 text-sm">← Back</button>
                )}
                <button onClick={saveLesson} disabled={saving} className="duo-btn-green flex-1 text-sm disabled:opacity-60">
                  {saving ? "Saving…" : isEdit ? "Save Changes" : "Save Lesson"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
