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
        </div>
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
