"use client";
import { useState } from "react";
import Link from "next/link";
import DeleteCourseButton from "@/components/ui/DeleteCourseButton";

interface AdminCourse {
  id: string;
  title: string;
  published: boolean;
  color: string;
  totalSpots: number;
}

export default function AdminCourseList({ courses }: { courses: AdminCourse[] }) {
  const [query, setQuery] = useState("");

  const filtered = courses.filter((c) =>
    !query || c.title.toLowerCase().includes(query.toLowerCase())
  );

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

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🔎</div>
          <p className="font-bold">No courses match.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((course) => (
            <div key={course.id} className="duo-card p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: course.color + "22" }}
                >
                  📚
                </div>
                <div>
                  <h3 className="font-black text-gray-800">{course.title}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    {course.published ? "✅ Published" : "⏳ Draft"}
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-400">{course.totalSpots} activities</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/courses/${course.id}`} className="duo-btn-outline text-xs py-2 px-4">
                  Edit
                </Link>
                <DeleteCourseButton courseId={course.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
