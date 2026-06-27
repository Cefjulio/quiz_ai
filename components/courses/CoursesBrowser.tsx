"use client";
import { useState } from "react";
import EnrollButton from "@/components/ui/EnrollButton";

interface BrowseCourse {
  id: string;
  title: string;
  description: string;
  color: string;
  unitCount: number;
  enrolled: boolean;
  pct: number;
  isCompleted: boolean;
}

type Tab = "all" | "inprogress" | "completed";

export default function CoursesBrowser({ courses }: { courses: BrowseCourse[] }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const enrolled = courses.filter((c) => c.enrolled);
  const inProgressCount = enrolled.filter((c) => !c.isCompleted).length;
  const completedCount = enrolled.filter((c) => c.isCompleted).length;

  const filtered = courses.filter((c) => {
    const q = query.toLowerCase();
    const matchesSearch = !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    const matchesTab =
      tab === "all" ||
      (tab === "completed" && c.enrolled && c.isCompleted) ||
      (tab === "inprogress" && c.enrolled && !c.isCompleted);
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search courses…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-2xl pl-9 pr-4 py-2.5 font-semibold text-sm focus:border-[#58CC02] focus:outline-none bg-white"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold">
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-200/70 rounded-2xl p-1">
        {(
          [
            { key: "all", label: "All Courses", count: courses.length },
            { key: "inprogress", label: "In Progress", count: inProgressCount },
            { key: "completed", label: "Completed", count: completedCount },
          ] as { key: Tab; label: string; count: number }[]
        ).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all ${
              tab === key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${tab === key ? "bg-[#58CC02] text-white" : "bg-gray-300 text-gray-600"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🔎</div>
          <p className="font-bold">No courses match.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => (
            <div key={course.id} className="duo-card p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: course.color + "22" }}
                >
                  📚
                </div>
                {course.enrolled && (
                  course.isCompleted ? (
                    <span className="text-xs font-black bg-[#58CC02] text-white px-2.5 py-1 rounded-full">✅ Done</span>
                  ) : (
                    <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full">In Progress</span>
                  )
                )}
              </div>
              <h3 className="font-black text-lg text-gray-800">{course.title}</h3>
              <p className="text-gray-500 text-sm mt-1 mb-2 flex-1 line-clamp-3">
                {course.description || "No description"}
              </p>
              <p className="text-xs font-bold text-gray-400 mb-2">
                {course.unitCount} unit{course.unitCount !== 1 ? "s" : ""}
              </p>
              {course.enrolled && (
                <div className="mb-3">
                  <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${course.isCompleted ? "bg-[#58CC02]" : "bg-[#1CB0F6]"}`}
                      style={{ width: `${course.pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 font-bold mt-1">{course.pct}% complete</p>
                </div>
              )}
              <EnrollButton courseId={course.id} enrolled={course.enrolled} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
