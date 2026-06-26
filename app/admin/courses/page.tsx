import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "@/components/ui/Navbar";
import Link from "next/link";
import DeleteCourseButton from "@/components/ui/DeleteCourseButton";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") redirect("/dashboard");

  const supabase = createAdminClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black text-gray-800">Manage Courses</h1>
          <div className="flex gap-3">
            <Link href="/admin/course-import" className="duo-btn-outline text-sm">
              📥 Batch Import
            </Link>
            <Link href="/admin/pdf-manager" className="duo-btn-outline text-sm">
              📄 PDF Manager
            </Link>
            <Link href="/admin/courses/new" className="duo-btn-green text-sm">
              + New Course
            </Link>
          </div>
        </div>

        {!courses || courses.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">📚</div>
            <p className="font-bold text-lg">No courses yet</p>
            <Link href="/admin/courses/new" className="duo-btn-green mt-4 inline-block">
              Create your first course
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <div key={course.id} className="duo-card p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: course.color + "22" }}
                  >
                    📚
                  </div>
                  <div>
                    <h3 className="font-black text-gray-800">{course.title}</h3>
                    <p className="text-sm text-gray-500">
                      {course.published ? "✅ Published" : "⏳ Draft"}
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
      </main>
    </div>
  );
}
