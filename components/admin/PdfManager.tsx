"use client";
import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";

const PdfPageGrid = dynamic(() => import("./PdfPageGrid"), { ssr: false });

interface Unit { id: string; title: string; }
interface Course { id: string; title: string; units: Unit[]; }

interface PdfUpload {
  id: string;
  title: string;
  file_url: string;
  total_pages: number;
  created_at: string;
  course_id: string | null;
}

export default function PdfManager({ courses }: { courses: Course[] }) {
  const [uploads, setUploads] = useState<PdfUpload[]>([]);
  const [loadedUploads, setLoadedUploads] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [uploadCourseId, setUploadCourseId] = useState("");
  const [filterCourseId, setFilterCourseId] = useState("ALL");
  const [selectedPdf, setSelectedPdf] = useState<PdfUpload | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadUploads() {
    const res = await fetch("/api/pdf-manager");
    if (res.ok) {
      setUploads(await res.json());
      setLoadedUploads(true);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!title.trim()) { toast.error("Enter a title first"); return; }
    if (!uploadCourseId) { toast.error("Select a course first"); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title.trim());
    fd.append("courseId", uploadCourseId);
    const res = await fetch("/api/pdf-manager/upload", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Upload failed");
      return;
    }
    const data = await res.json();
    toast.success(`Uploaded! ${data.totalPages} pages extracted.`);
    setTitle("");
    setUploadCourseId("");
    if (fileRef.current) fileRef.current.value = "";
    setFilterCourseId(uploadCourseId);
    await loadUploads();
  }

  async function deletePdf(id: string) {
    if (!confirm("Delete this PDF and all its page data?")) return;
    await fetch(`/api/pdf-manager/${id}`, { method: "DELETE" });
    setUploads((prev) => prev.filter((u) => u.id !== id));
    if (selectedPdf?.id === id) setSelectedPdf(null);
    toast.success("Deleted");
  }

  const filteredUploads = filterCourseId === "ALL"
    ? uploads
    : uploads.filter((u) => u.course_id === filterCourseId);

  const courseMap: Record<string, string> = {};
  courses.forEach((c) => { courseMap[c.id] = c.title; });

  if (selectedPdf) {
    return (
      <PdfPageGrid
        pdf={selectedPdf}
        courses={courses}
        onBack={() => { setSelectedPdf(null); loadUploads(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload card */}
      <div className="duo-card p-6 space-y-4">
        <h2 className="font-black text-lg text-gray-700">Upload a PDF</h2>
        <div className="flex gap-3 flex-wrap">
          {/* Course selector */}
          <select
            value={uploadCourseId}
            onChange={(e) => setUploadCourseId(e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-4 py-2 font-semibold focus:border-[#58CC02] focus:outline-none text-sm bg-white min-w-48"
          >
            <option value="">Select a course…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title…"
            className="flex-1 min-w-48 border-2 border-gray-200 rounded-xl px-4 py-2 font-semibold focus:border-[#58CC02] focus:outline-none text-sm"
          />
          <button
            onClick={() => {
              if (!uploadCourseId) { toast.error("Select a course first"); return; }
              if (!title.trim()) { toast.error("Enter a title first"); return; }
              fileRef.current?.click();
            }}
            disabled={uploading}
            className="duo-btn-green text-sm px-6 disabled:opacity-60"
          >
            {uploading ? "Uploading & parsing…" : "📄 Upload PDF"}
          </button>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
        </div>
        {uploading && (
          <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-700 font-semibold">
            ⏳ Extracting text from each page… this may take a moment for large PDFs.
          </div>
        )}
      </div>

      {/* PDF list with course filter */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="font-black text-xl text-gray-800">Your PDFs</h2>
          {!loadedUploads && (
            <button onClick={loadUploads} className="duo-btn-outline text-sm py-2 px-4">Load PDFs</button>
          )}
        </div>

        {/* Course filter tabs */}
        {loadedUploads && (
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              onClick={() => setFilterCourseId("ALL")}
              className={`text-xs font-black px-3 py-1.5 rounded-full transition-colors ${
                filterCourseId === "ALL" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              All ({uploads.length})
            </button>
            {courses.map((c) => {
              const count = uploads.filter((u) => u.course_id === c.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={c.id}
                  onClick={() => setFilterCourseId(c.id)}
                  className={`text-xs font-black px-3 py-1.5 rounded-full transition-colors ${
                    filterCourseId === c.id ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {c.title} ({count})
                </button>
              );
            })}
            {uploads.some((u) => !u.course_id) && (
              <button
                onClick={() => setFilterCourseId("NONE")}
                className={`text-xs font-black px-3 py-1.5 rounded-full transition-colors ${
                  filterCourseId === "NONE" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                Unassigned ({uploads.filter((u) => !u.course_id).length})
              </button>
            )}
          </div>
        )}

        {loadedUploads && filteredUploads.length === 0 && (
          <div className="duo-card p-12 text-center text-gray-400">
            <div className="text-4xl mb-2">📂</div>
            <p className="font-bold">No PDFs {filterCourseId !== "ALL" ? "for this course" : "uploaded yet"}.</p>
          </div>
        )}

        {filteredUploads.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUploads.map((pdf) => (
              <div key={pdf.id} className="duo-card p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">📄</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-800 truncate">{pdf.title}</p>
                    <p className="text-sm text-gray-400 font-semibold">{pdf.total_pages} pages</p>
                    {pdf.course_id && courseMap[pdf.course_id] && (
                      <p className="text-xs font-bold text-[#58CC02] mt-0.5">📚 {courseMap[pdf.course_id]}</p>
                    )}
                    <p className="text-xs text-gray-300">{new Date(pdf.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPdf(pdf)}
                    className="duo-btn-blue text-xs py-2 flex-1"
                  >
                    📑 Browse Pages
                  </button>
                  <button
                    onClick={() => deletePdf(pdf.id)}
                    className="text-xs text-red-400 hover:text-red-600 font-bold px-3"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
