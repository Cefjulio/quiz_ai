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
}

export default function PdfManager({ courses }: { courses: Course[] }) {
  const [uploads, setUploads] = useState<PdfUpload[]>([]);
  const [loadedUploads, setLoadedUploads] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
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
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title.trim());
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
    if (fileRef.current) fileRef.current.value = "";
    await loadUploads();
  }

  async function deletePdf(id: string) {
    if (!confirm("Delete this PDF and all its page data?")) return;
    await fetch(`/api/pdf-manager/${id}`, { method: "DELETE" });
    setUploads((prev) => prev.filter((u) => u.id !== id));
    if (selectedPdf?.id === id) setSelectedPdf(null);
    toast.success("Deleted");
  }

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
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title…"
            className="flex-1 min-w-48 border-2 border-gray-200 rounded-xl px-4 py-2 font-semibold focus:border-[#58CC02] focus:outline-none text-sm"
          />
          <button
            onClick={() => { if (!title.trim()) { toast.error("Enter a title first"); return; } fileRef.current?.click(); }}
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

      {/* Uploaded PDFs list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-xl text-gray-800">Your PDFs</h2>
          {!loadedUploads && (
            <button onClick={loadUploads} className="duo-btn-outline text-sm py-2 px-4">Load PDFs</button>
          )}
        </div>

        {loadedUploads && uploads.length === 0 && (
          <div className="duo-card p-12 text-center text-gray-400">
            <div className="text-4xl mb-2">📂</div>
            <p className="font-bold">No PDFs uploaded yet.</p>
          </div>
        )}

        {uploads.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploads.map((pdf) => (
              <div key={pdf.id} className="duo-card p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">📄</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-800 truncate">{pdf.title}</p>
                    <p className="text-sm text-gray-400 font-semibold">{pdf.total_pages} pages</p>
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
