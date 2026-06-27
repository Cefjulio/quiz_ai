import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "@/components/ui/Navbar";
import Link from "next/link";
import AdminCourseList from "@/components/admin/AdminCourseList";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") redirect("/dashboard");

  const supabase = createAdminClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*, units(path_spots(id))")
    .order("created_at", { ascending: false });

  const shaped = (courses ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    published: c.published,
    color: c.color ?? "#58CC02",
    totalSpots: (c.units ?? []).flatMap((u: { path_spots: { id: string }[] }) => u.path_spots ?? []).length,
  }));

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black text-gray-800">Manage Courses</h1>
          <div className="flex gap-3 flex-wrap justify-end">
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

        {shaped.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">📚</div>
            <p className="font-bold text-lg">No courses yet</p>
            <Link href="/admin/courses/new" className="duo-btn-green mt-4 inline-block">
              Create your first course
            </Link>
          </div>
        ) : (
          <AdminCourseList courses={shaped} />
        )}
      </main>
    </div>
  );
}
