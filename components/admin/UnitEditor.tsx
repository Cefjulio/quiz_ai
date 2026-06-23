"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import LessonUploader from "./LessonUploader";
import QuizGenerator from "./QuizGenerator";
import LessonPreview from "./LessonPreview";
import QuizPreview from "./QuizPreview";

interface Slide {
  type: string;
  content: string;
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
}

interface Question {
  id: string;
  type: string;
  prompt: { text: string; imageUrl?: string; audioUrl?: string; videoUrl?: string };
  answers: { id: string; text: string; imageUrl?: string; audioUrl?: string }[];
  correctAnswer: string | string[] | Record<string, string>;
}

interface PathSpot {
  id: string;
  order: number;
  type: string;
  lesson_id: string | null;
  quiz_id: string | null;
  lesson: { id: string; title: string; slides: Slide[]; file_url: string | null; file_ext: string | null } | null;
  quiz: { id: string; title: string; questions: { count: number }[] } | null;
}

interface Unit {
  id: string;
  title: string;
  description: string | null;
  order: number;
  path_spots: PathSpot[];
}

export default function UnitEditor({ unit }: { unit: Unit; courseId: string }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [showLessonUploader, setShowLessonUploader] = useState(false);
  const [showQuizGenerator, setShowQuizGenerator] = useState(false);
  const [editingSpot, setEditingSpot] = useState<PathSpot | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [previewLesson, setPreviewLesson] = useState<{ title: string; slides: Slide[]; fileUrl?: string | null; fileExt?: string | null } | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<{ id: string; title: string; questions: Question[] } | null>(null);
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);
  const [editingUnit, setEditingUnit] = useState(false);
  const [editTitle, setEditTitle] = useState(unit.title);
  const [editDescription, setEditDescription] = useState(unit.description || "");
  const [savingUnit, setSavingUnit] = useState(false);

  const spots = unit.path_spots ?? [];

  async function deleteUnit() {
    if (!confirm("Delete this unit and all its spots?")) return;
    await fetch(`/api/units/${unit.id}`, { method: "DELETE" });
    toast.success("Unit deleted");
    router.refresh();
  }

  async function saveUnit() {
    setSavingUnit(true);
    await fetch(`/api/units/${unit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, description: editDescription }),
    });
    setSavingUnit(false);
    setEditingUnit(false);
    toast.success("Unit updated");
    router.refresh();
  }

  async function deleteSpot(spot: PathSpot) {
    if (!confirm("Remove this spot and its content?")) return;
    await fetch(`/api/spots/${spot.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: spot.lesson_id, quizId: spot.quiz_id }),
    });
    toast.success("Spot removed");
    router.refresh();
  }

  function openEditLesson(spot: PathSpot) {
    setEditingSpot(spot);
    setShowLessonUploader(true);
  }

  function openEditQuiz(spot: PathSpot) {
    setEditingSpot(spot);
    setShowQuizGenerator(true);
  }

  async function viewQuiz(spot: PathSpot) {
    if (!spot.quiz_id) return;
    setLoadingQuizId(spot.quiz_id);
    const res = await fetch(`/api/quizzes/${spot.quiz_id}`);
    setLoadingQuizId(null);
    if (!res.ok) return;
    const quiz = await res.json();
    setPreviewQuiz({ id: quiz.id, title: quiz.title, questions: quiz.questions ?? [] });
  }

  function openNewQuiz(lessonId: string) {
    setSelectedLessonId(lessonId);
    setEditingSpot(null);
    setShowQuizGenerator(true);
  }

  const lessonSpots = spots.filter((s) => s.type === "LESSON");

  return (
    <div className="duo-card overflow-hidden">
      {/* Unit header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        style={{ backgroundColor: "#f0fdf4" }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-xl">{collapsed ? "▶" : "▼"}</span>
        <h3 className="flex-1 font-black text-gray-800 text-lg">{unit.title}</h3>
        <span className="text-xs text-gray-500 font-bold">
          {spots.length} spot{spots.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setEditingUnit(true); }}
          className="text-xs text-[#1CB0F6] hover:text-blue-600 font-bold px-2"
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); deleteUnit(); }}
          className="text-xs text-red-400 hover:text-red-600 font-bold px-2"
        >
          Delete
        </button>
      </div>

      {/* Edit unit modal */}
      {editingUnit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-black text-lg text-gray-800">Edit Unit</h3>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Title</label>
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 font-semibold focus:border-[#58CC02] focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Description (optional)</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 font-semibold focus:border-[#58CC02] focus:outline-none text-sm resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditingUnit(false)} className="duo-btn-outline flex-1 text-sm">Cancel</button>
              <button onClick={saveUnit} disabled={savingUnit} className="duo-btn-green flex-1 text-sm disabled:opacity-60">
                {savingUnit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="p-4 space-y-3">
          {unit.description && (
            <p className="text-sm text-gray-500 italic">{unit.description}</p>
          )}

          {spots.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No spots yet. Add a lesson or quiz below.</p>
          ) : (
            <div className="space-y-2">
              {spots.map((spot) => (
                <div key={spot.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${spot.type === "LESSON" ? "bg-[#1CB0F6]" : "bg-[#CE82FF]"}`}>
                    {spot.type === "LESSON" ? "📖" : "🧠"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">
                      {spot.lesson?.title || spot.quiz?.title || "Untitled"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {spot.type === "LESSON" ? "Lesson" : `Quiz · ${spot.quiz?.questions?.[0]?.count ?? 0} questions`}
                    </p>
                  </div>

                  {/* Edit / View buttons */}
                  {spot.type === "LESSON" && spot.lesson && (
                    <button
                      onClick={() => setPreviewLesson({ title: spot.lesson!.title, slides: spot.lesson!.slides, fileUrl: spot.lesson!.file_url, fileExt: spot.lesson!.file_ext })}
                      className="text-xs text-green-600 hover:text-green-800 font-bold px-2"
                    >
                      👁 View
                    </button>
                  )}
                  {spot.type === "LESSON" && (
                    <button
                      onClick={() => openEditLesson(spot)}
                      className="text-xs text-[#1CB0F6] hover:text-blue-600 font-bold px-2"
                    >
                      ✏️ Edit
                    </button>
                  )}
                  {spot.type === "QUIZ" && (
                    <button
                      onClick={() => viewQuiz(spot)}
                      disabled={loadingQuizId === spot.quiz_id}
                      className="text-xs text-green-600 hover:text-green-800 font-bold px-2 disabled:opacity-50"
                    >
                      {loadingQuizId === spot.quiz_id ? "…" : "👁 View"}
                    </button>
                  )}
                  {spot.type === "QUIZ" && (
                    <button
                      onClick={() => openEditQuiz(spot)}
                      className="text-xs text-purple-500 hover:text-purple-700 font-bold px-2"
                    >
                      🔄 Regen
                    </button>
                  )}
                  {spot.type === "LESSON" && spot.lesson_id && (
                    <button
                      onClick={() => openNewQuiz(spot.lesson_id!)}
                      className="text-xs bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-lg hover:bg-purple-200"
                    >
                      + Quiz
                    </button>
                  )}
                  <button
                    onClick={() => deleteSpot(spot)}
                    className="text-xs text-red-400 hover:text-red-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={() => { setEditingSpot(null); setShowLessonUploader(true); }} className="duo-btn-blue text-xs py-2 px-4">
              📖 Add Lesson
            </button>
            {lessonSpots.length > 0 && (
              <button
                onClick={() => openNewQuiz(lessonSpots[lessonSpots.length - 1].lesson_id!)}
                className="text-xs bg-purple-500 text-white font-bold px-4 py-2 rounded-xl border-b-4 border-purple-700 hover:bg-purple-600 active:translate-y-1 transition-all"
              >
                🧠 Add AI Quiz
              </button>
            )}
          </div>
        </div>
      )}

      {showLessonUploader && (
        <LessonUploader
          unitId={unit.id}
          lessonId={editingSpot?.lesson_id ?? undefined}
          initialTitle={editingSpot?.lesson?.title}
          initialSlides={editingSpot?.lesson?.slides}
          onClose={() => { setShowLessonUploader(false); setEditingSpot(null); }}
          onDone={() => { setShowLessonUploader(false); setEditingSpot(null); router.refresh(); }}
        />
      )}

      {previewQuiz && (
        <QuizPreview
          quiz={previewQuiz}
          onClose={() => setPreviewQuiz(null)}
        />
      )}

      {previewLesson && (
        <LessonPreview
          title={previewLesson.title}
          slides={previewLesson.slides}
          fileUrl={previewLesson.fileUrl}
          fileExt={previewLesson.fileExt}
          onClose={() => setPreviewLesson(null)}
        />
      )}

      {showQuizGenerator && (
        <QuizGenerator
          unitId={unit.id}
          lessonId={selectedLessonId || editingSpot?.lesson_id || lessonSpots[0]?.lesson_id || ""}
          existingQuizId={editingSpot?.quiz_id ?? undefined}
          onClose={() => { setShowQuizGenerator(false); setEditingSpot(null); setSelectedLessonId(null); }}
          onDone={() => { setShowQuizGenerator(false); setEditingSpot(null); setSelectedLessonId(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
