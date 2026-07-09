"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import UnitEditor from "./UnitEditor";

interface PathSpot {
  id: string;
  order: number;
  type: string;
  lesson_id: string | null;
  quiz_id: string | null;
  lesson: { id: string; title: string; slides: { type: string; content: string; audioUrl?: string; videoUrl?: string; imageUrl?: string }[]; file_url: string | null; file_ext: string | null } | null;
  quiz: { id: string; title: string; questions: { count: number }[] } | null;
}

interface Unit {
  id: string;
  title: string;
  description: string | null;
  order: number;
  path_spots: PathSpot[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  color: string;
  published: boolean;
  units: Unit[];
}

const COLORS = ["#58CC02", "#1CB0F6", "#FF9600", "#CE82FF", "#FF4B4B", "#FFC800"];

export default function CourseEditor({ course }: { course: Course }) {
  const router = useRouter();
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || "");
  const [color, setColor] = useState(course.color || "#58CC02");
  const [published, setPublished] = useState(course.published);
  const [saving, setSaving] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [regenResults, setRegenResults] = useState<Array<{ lessonTitle: string; slideCount?: number; flashcardCount?: number; error?: string }> | null>(null);

  async function saveCourse() {
    setSaving(true);
    await fetch(`/api/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, color, published }),
    });
    setSaving(false);
    toast.success("Course saved!");
    router.refresh();
  }

  async function regenerateAllLessons() {
    if (!confirm("This will re-generate ALL lesson summaries and flashcards in this course using the stored transcripts. Existing content will be replaced. Continue?")) return;
    setRegenerating(true);
    setRegenResults(null);
    toast("Regenerating lessons… this may take a few minutes.", { icon: "⏳" });

    const res = await fetch("/api/admin/regenerate-course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: course.id }),
    });

    if (res.ok) {
      const { results } = await res.json();
      setRegenResults(results);
      const ok = results.filter((r: { error?: string }) => !r.error).length;
      const fail = results.filter((r: { error?: string }) => r.error).length;
      if (fail === 0) toast.success(`All ${ok} lessons regenerated!`);
      else toast.error(`${ok} regenerated, ${fail} failed — see details below.`);
      router.refresh();
    } else {
      toast.error("Regeneration failed — check the console");
    }
    setRegenerating(false);
  }

  async function addUnit() {
    if (!newUnitTitle.trim()) return;
    const res = await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: course.id, title: newUnitTitle }),
    });
    if (res.ok) {
      setNewUnitTitle("");
      setAddingUnit(false);
      toast.success("Unit added!");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Course settings */}
      <div className="duo-card p-6">
        <h2 className="font-black text-lg text-gray-700 mb-4">Course Settings</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 font-semibold focus:border-[#58CC02] focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 font-semibold focus:border-[#58CC02] focus:outline-none text-sm"
            />
          </div>
        </div>
        <div className="mt-4">
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Color Theme</label>
            <div className="flex gap-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: c, outline: color === c ? `3px solid ${c}` : "none", outlineOffset: "3px" }}
                />
              ))}
            </div>
          </div>
        <div className="flex items-center gap-4 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setPublished(!published)}
              className={`w-12 h-6 rounded-full transition-colors ${published ? "bg-[#58CC02]" : "bg-gray-300"} relative`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${published ? "translate-x-7" : "translate-x-1"}`}
              />
            </div>
            <span className="font-bold text-sm text-gray-600">
              {published ? "Published" : "Draft"}
            </span>
          </label>
          <button onClick={saveCourse} disabled={saving} className="duo-btn-green text-sm py-2 px-5">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            onClick={regenerateAllLessons}
            disabled={regenerating}
            className="duo-btn-outline text-sm py-2 px-4 disabled:opacity-50"
            title="Re-generate all lesson summaries and flashcards from stored transcripts"
          >
            {regenerating ? "⏳ Regenerating…" : "🔄 Regenerate All Lessons"}
          </button>
        </div>

        {regenResults && (
          <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-black text-gray-500 uppercase tracking-wide">
              Regeneration Results
            </div>
            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
              {regenResults.map((r, i) => (
                <div key={i} className="px-4 py-2 flex items-start gap-3 text-sm">
                  <span className="flex-shrink-0 mt-0.5">{r.error ? "❌" : "✅"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{r.lessonTitle}</p>
                    {r.error
                      ? <p className="text-red-500 text-xs mt-0.5">{r.error}</p>
                      : <p className="text-gray-400 text-xs mt-0.5">{r.slideCount} page{r.slideCount !== 1 ? "s" : ""} · {r.flashcardCount} flashcards</p>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Units */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-xl text-gray-800">Units & Pathway</h2>
          <button onClick={() => setAddingUnit(true)} className="duo-btn-outline text-sm py-2 px-4">
            + Add Unit
          </button>
        </div>

        {addingUnit && (
          <div className="duo-card p-4 mb-4 flex gap-3">
            <input
              autoFocus
              value={newUnitTitle}
              onChange={(e) => setNewUnitTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUnit()}
              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 font-semibold focus:border-[#58CC02] focus:outline-none text-sm"
              placeholder="Unit title…"
            />
            <button onClick={addUnit} className="duo-btn-green text-sm py-2 px-4">Add</button>
            <button onClick={() => setAddingUnit(false)} className="duo-btn-outline text-sm py-2 px-4">Cancel</button>
          </div>
        )}

        {course.units.length === 0 ? (
          <div className="text-center py-12 text-gray-400 duo-card">
            <div className="text-4xl mb-2">📦</div>
            <p className="font-bold">No units yet. Add your first unit above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {course.units.map((unit) => (
              <UnitEditor key={unit.id} unit={unit} courseId={course.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
