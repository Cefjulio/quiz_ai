import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "@/components/ui/Navbar";
import Link from "next/link";
import RealtimeSync from "@/components/RealtimeSync";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const isAdmin = user.user_metadata?.role === "ADMIN";
  const supabase = createAdminClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`course:courses(*, units(*, path_spots(*)))`)
    .eq("user_id", user.id);

  const allCourses = isAdmin
    ? (await supabase.from("courses").select("*").order("created_at", { ascending: false })).data ?? []
    : [];

  const { data: userProgress } = await supabase
    .from("progress")
    .select("path_spot_id")
    .eq("user_id", user.id)
    .eq("completed", true);
  const completedIds = new Set((userProgress ?? []).map((p) => p.path_spot_id));

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <RealtimeSync userId={user.id} />
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black text-gray-800">
            {isAdmin ? "My Courses" : "Keep Learning! 🔥"}
          </h1>
          {isAdmin && (
            <Link href="/admin/courses/new" className="duo-btn-green text-sm">
              + New Course
            </Link>
          )}
        </div>

        {isAdmin && allCourses.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-gray-600 mb-3 uppercase tracking-wide">
              Courses You Manage
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {allCourses.map((course) => (
                <div key={course.id} className="duo-card p-5">
                  <div
                    className="w-12 h-12 rounded-2xl mb-3 flex items-center justify-center text-2xl"
                    style={{ backgroundColor: course.color + "22" }}
                  >
                    📚
                  </div>
                  <h3 className="font-black text-lg text-gray-800">{course.title}</h3>
                  <p className="text-gray-500 text-sm mt-1 mb-4 line-clamp-2">
                    {course.description || "No description"}
                  </p>
                  <div className="flex gap-2">
                    <Link href={`/admin/courses/${course.id}`} className="duo-btn-outline text-xs py-2 px-4">
                      Edit
                    </Link>
                    <Link href={`/learn/${course.id}`} className="duo-btn-green text-xs py-2 px-4">
                      Preview
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isAdmin && (
          <>
            {!enrollments || enrollments.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📖</div>
                <h2 className="text-2xl font-black text-gray-700 mb-2">No courses yet</h2>
                <p className="text-gray-500 mb-6">Browse available courses to get started</p>
                <Link href="/courses" className="duo-btn-green">
                  Browse Courses
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {enrollments.map(({ course: _c }) => {
                  const course = _c as unknown as { id: string; title: string; description: string; color: string; units: { path_spots: { id: string }[] }[] } | null;
                  if (!course) return null;
                  const allSpots = (course.units ?? []).flatMap((u) => u.path_spots ?? []);
                  const doneSpots = allSpots.filter((s) => completedIds.has(s.id)).length;
                  const pct = allSpots.length > 0 ? Math.round((doneSpots / allSpots.length) * 100) : 0;
                  return (
                    <Link key={course.id} href={`/learn/${course.id}`} className="duo-card p-5 block hover:shadow-md transition">
                      <div
                        className="w-12 h-12 rounded-2xl mb-3 flex items-center justify-center text-2xl"
                        style={{ backgroundColor: course.color + "22" }}
                      >
                        📚
                      </div>
                      <h3 className="font-black text-lg text-gray-800">{course.title}</h3>
                      <p className="text-gray-500 text-sm mt-1 mb-3 line-clamp-2">{course.description}</p>
                      <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className="h-3 rounded-full bg-[#58CC02] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs font-bold text-gray-400 mt-1">{pct}% complete</p>
                    </Link>
                  );
                })}
              </div>
            )}
            <div className="mt-6">
              <Link href="/courses" className="text-[#1CB0F6] font-bold hover:underline">
                Browse all courses →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
