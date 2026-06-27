"use client";
import { useState } from "react";
import Link from "next/link";

interface EnrolledCourse {
  id: string;
  title: string;
  description: string;
  color: string;
  totalSpots: number;
  completedSpots: number;
}

type Tab = "all" | "inprogress" | "completed";

export default function StudentCourseList({ courses }: { courses: EnrolledCourse[] }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const withStats = courses.map((c) => ({
    ...c,
    pct: c.totalSpots > 0 ? Math.round((c.completedSpots / c.totalSpots) * 100) : 0,
    isCompleted: c.totalSpots > 0 && c.completedSpots >= c.totalSpots,
    isStarted: c.completedSpots > 0,
  }));

  const filtered = withStats.filter((c) => {
    const q = query.toLowerCase();
    const matchesSearch = !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    const matchesTab =
      tab === "all" ||
      (tab === "completed" && c.isCompleted) ||
      (tab === "inprogress" && !c.isCompleted);
    return matchesSearch && matchesTab;
  });

  const inProgressCount = withStats.filter((c) => !c.isCompleted).length;
  const completedCount = withStats.filter((c) => c.isCompleted).length;

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
            { key: "all", label: "All", count: withStats.length },
            { key: "inprogress", label: "In Progress", count: inProgressCount },
            { key: "completed", label: "Completed", count: completedCount },
          ] as { key: Tab; label: string; count: number }[]
        ).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all ${
              tab === key
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${tab === key ? "bg-[#58CC02] text-white" : "bg-gray-300 text-gray-600"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🔎</div>
          <p className="font-bold">No courses match your search.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((course) => (
            <Link
              key={course.id}
              href={`/learn/${course.id}`}
              className="duo-card p-5 block hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: course.color + "22" }}
                >
                  📚
                </div>
                {course.isCompleted ? (
                  <span className="text-xs font-black bg-[#58CC02] text-white px-2.5 py-1 rounded-full">
                    ✅ Done
                  </span>
                ) : course.isStarted ? (
                  <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full">
                    In Progress
                  </span>
                ) : (
                  <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                    Not started
                  </span>
                )}
              </div>
              <h3 className="font-black text-lg text-gray-800 group-hover:text-[#58CC02] transition-colors">
                {course.title}
              </h3>
              <p className="text-gray-500 text-sm mt-1 mb-3 line-clamp-2">{course.description}</p>
              <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${course.isCompleted ? "bg-[#58CC02]" : "bg-[#1CB0F6]"}`}
                  style={{ width: `${course.pct}%` }}
                />
              </div>
              <p className="text-xs font-bold text-gray-400 mt-1.5">
                {course.completedSpots}/{course.totalSpots} activities · {course.pct}% complete
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
