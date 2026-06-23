"use client";
import { useState } from "react";
import toast from "react-hot-toast";

export default function QuizGenerator({
  unitId,
  lessonId,
  existingQuizId,   // present = regenerate mode (don't create new spot)
  onClose,
  onDone,
}: {
  unitId: string;
  lessonId: string;
  existingQuizId?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const isRegenerate = !!existingQuizId;
  const [title, setTitle] = useState("Quiz");
  const [count, setCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<{ type: string; prompt: { text: string } }[] | null>(null);
  const [quizId, setQuizId] = useState<string | null>(existingQuizId ?? null);
  const [saving, setSaving] = useState(false);

  async function generateQuiz() {
    setGenerating(true);
    let targetQuizId = quizId;

    if (!isRegenerate && !targetQuizId) {
      // Create empty quiz first (new mode only)
      const qRes = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, lessonId, questions: [] }),
      });
      if (!qRes.ok) { setGenerating(false); toast.error("Failed to create quiz"); return; }
      const quiz = await qRes.json();
      targetQuizId = quiz.id;
      setQuizId(quiz.id);
    }

    const genRes = await fetch(`/api/quizzes/${targetQuizId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, count }),
    });
    setGenerating(false);
    if (!genRes.ok) { toast.error("AI generation failed. Check your API key."); return; }
    const generated = await genRes.json();
    setPreview(generated.questions);
    toast.success(`Generated ${generated.questions.length} questions!`);
  }

  async function confirm() {
    if (!quizId) return;
    if (isRegenerate) {
      // Just close — questions are already saved in the DB
      toast.success("Quiz regenerated!");
      onDone();
      return;
    }
    setSaving(true);
    await fetch("/api/spots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId, type: "QUIZ", quizId }),
    });
    setSaving(false);
    toast.success("Quiz added to pathway!");
    onDone();
  }

  const typeEmoji: Record<string, string> = {
    MCQ: "🔘", TRUE_FALSE: "✅", FILL_BLANK: "✏️",
    DRAG_DROP: "↕️", MATCH: "🔗", MEMORY: "🃏", DROPDOWN: "▼",
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-800">
            {isRegenerate ? "🔄 Regenerate Quiz" : "🧠 AI Quiz Generator"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {!preview ? (
            <>
              {!isRegenerate && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Quiz Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 font-semibold focus:border-[#58CC02] focus:outline-none text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Number of Questions</label>
                <input
                  type="number" min={3} max={20} value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-32 border-2 border-gray-200 rounded-xl px-4 py-2 font-semibold focus:border-[#58CC02] focus:outline-none text-sm"
                />
              </div>
              {isRegenerate && (
                <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-700 font-semibold">
                  ⚠️ This will replace all existing questions with newly generated ones.
                </div>
              )}
              <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-700 font-semibold">
                Claude AI will generate a mix of MCQ, True/False, Fill-in-the-blank, Drag &amp; Drop, Match, Memory, and Dropdown questions.
              </div>
              <button
                onClick={generateQuiz}
                disabled={generating}
                className="w-full text-sm bg-purple-500 text-white font-bold px-4 py-3 rounded-xl border-b-4 border-purple-700 hover:bg-purple-600 active:translate-y-1 transition-all disabled:opacity-60"
              >
                {generating ? "✨ Generating with AI…" : isRegenerate ? "✨ Regenerate Questions" : "✨ Generate Quiz"}
              </button>
            </>
          ) : (
            <>
              <p className="font-bold text-gray-600 text-sm">Preview — {preview.length} questions generated:</p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {preview.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                    <span className="text-lg">{typeEmoji[q.type] || "❓"}</span>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase">{q.type}</p>
                      <p className="text-sm font-semibold text-gray-700">{q.prompt.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPreview(null)} className="duo-btn-outline flex-1 text-sm">
                  Regenerate
                </button>
                <button onClick={confirm} disabled={saving} className="duo-btn-green flex-1 text-sm disabled:opacity-60">
                  {saving ? "Saving…" : isRegenerate ? "✓ Save Changes" : "✓ Add to Pathway"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
