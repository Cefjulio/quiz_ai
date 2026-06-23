"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import toast from "react-hot-toast";
import Link from "next/link";

const COLORS = ["#58CC02", "#1CB0F6", "#FF9600", "#CE82FF", "#FF4B4B", "#FFC800"];

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#58CC02");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, color }),
    });
    setLoading(false);
    if (res.ok) {
      const course = await res.json();
      toast.success("Course created!");
      router.push(`/admin/courses/${course.id}`);
    } else {
      toast.error("Failed to create course");
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/courses" className="text-gray-400 hover:text-gray-600">←</Link>
          <h1 className="text-3xl font-black text-gray-800">New Course</h1>
        </div>
        <div className="duo-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1 uppercase tracking-wide">
                Course Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-semibold focus:border-[#58CC02] focus:outline-none"
                placeholder="e.g. Spanish for Beginners"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1 uppercase tracking-wide">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-semibold focus:border-[#58CC02] focus:outline-none resize-none"
                placeholder="What will students learn?"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-2 uppercase tracking-wide">
                Color Theme
              </label>
              <div className="flex gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-10 h-10 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      outline: color === c ? `3px solid ${c}` : "none",
                      outlineOffset: "3px",
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="duo-btn-green w-full text-lg disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create Course"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
