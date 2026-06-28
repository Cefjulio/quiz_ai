"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  title: string;
  color: string;
}

type Mode = "interview" | "exam";

export default function InterviewSetup({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("interview");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");

  function start() {
    if (!courseId) return;
    router.push(`/interview/session?courseId=${courseId}&mode=${mode}`);
  }

  return (
    <div className="space-y-8">
      {/* Mode selector */}
      <div>
        <p className="text-sm font-black text-gray-500 uppercase tracking-wide mb-3">
          Select Practice Mode
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => setMode("interview")}
            className={`duo-card p-5 text-left transition-all ${
              mode === "interview"
                ? "border-2 border-[#58CC02] ring-2 ring-[#58CC02]/20"
                : "border-2 border-transparent hover:border-gray-200"
            }`}
          >
            <div className="text-4xl mb-3">💼</div>
            <h3 className="font-black text-gray-800 text-lg">Job Interview</h3>
            <p className="text-sm text-gray-500 mt-1">
              AI plays a hiring manager. Behavioral and technical questions
              based on the course material. Get feedback at the end.
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              {["~8 questions", "Behavioral", "Feedback"].map((tag) => (
                <span key={tag} className="text-[10px] font-bold bg-[#58CC02]/10 text-[#58CC02] px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </button>

          <button
            onClick={() => setMode("exam")}
            className={`duo-card p-5 text-left transition-all ${
              mode === "exam"
                ? "border-2 border-[#1CB0F6] ring-2 ring-[#1CB0F6]/20"
                : "border-2 border-transparent hover:border-gray-200"
            }`}
          >
            <div className="text-4xl mb-3">📜</div>
            <h3 className="font-black text-gray-800 text-lg">Certification Exam</h3>
            <p className="text-sm text-gray-500 mt-1">
              AI plays an exam proctor. Technical questions from the course,
              instant feedback per answer, scored out of 10 at the end.
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              {["10 questions", "Technical", "Scored"].map((tag) => (
                <span key={tag} className="text-[10px] font-bold bg-[#1CB0F6]/10 text-[#1CB0F6] px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        </div>
      </div>

      {/* Course selector */}
      <div>
        <p className="text-sm font-black text-gray-500 uppercase tracking-wide mb-3">
          Course to Practice
        </p>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setCourseId(c.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all ${
                courseId === c.id
                  ? "bg-gray-100 border-2 border-gray-300"
                  : "border-2 border-transparent hover:bg-gray-50"
              }`}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: (c.color ?? "#58CC02") + "22" }}
              >
                📚
              </div>
              <span className="font-bold text-gray-800 text-sm">{c.title}</span>
              {courseId === c.id && (
                <span className="ml-auto text-[#58CC02] font-black text-sm">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800 space-y-1">
        <p className="font-black mb-1.5">💡 Before you start</p>
        <p>• Use <strong>Chrome or Edge</strong> for the best microphone support</p>
        <p>• Find a quiet place — the mic picks up background noise</p>
        <p>• <strong>Hold</strong> the mic button to speak, <strong>release</strong> to send</p>
        <p>• Tap 🔊 to skip the AI response if needed</p>
      </div>

      {/* Start button */}
      <button
        onClick={start}
        disabled={!courseId}
        className={`w-full py-4 rounded-2xl font-black text-white text-lg transition-all disabled:opacity-50 shadow-lg ${
          mode === "interview"
            ? "bg-[#58CC02] hover:bg-[#46a302] shadow-[#58CC02]/30"
            : "bg-[#1CB0F6] hover:bg-[#169fd9] shadow-[#1CB0F6]/30"
        }`}
      >
        {mode === "interview" ? "💼 Start Interview →" : "📜 Start Exam →"}
      </button>
    </div>
  );
}
