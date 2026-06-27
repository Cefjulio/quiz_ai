import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "@/components/ui/Navbar";
import Link from "next/link";
import RealtimeSync from "@/components/RealtimeSync";
import StudentCourseList from "@/components/dashboard/StudentCourseList";
import AdminCourseList from "@/components/admin/AdminCourseList";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const isAdmin = user.user_metadata?.role === "ADMIN";
  const supabase = createAdminClient();

  // ── Admin data ────────────────────────────────────────────────────────────
  const allCourses = isAdmin
    ? (
        await supabase
          .from("courses")
          .select("*, units(path_spots(id))")
          .order("created_at", { ascending: false })
      ).data ?? []
    : [];

  const adminShaped = allCourses.map((c) => ({
    id: c.id,
    title: c.title,
    published: c.published,
    color: c.color ?? "#58CC02",
    totalSpots: (c.units ?? []).flatMap((u: { path_spots: { id: string }[] }) => u.path_spots ?? []).length,
  }));

  // ── Student data ──────────────────────────────────────────────────────────
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`course:courses(id, title, description, color, units(path_spots(id)))`)
    .eq("user_id", user.id);

  type RawCourse = {
    id: string;
    title: string;
    description: string;
    color: string;
    units: { path_spots: { id: string }[] }[];
  };

  const enrolledCourses = (enrollments ?? [])
    .map((e) => e.course as unknown as RawCourse | null)
    .filter(Boolean) as RawCourse[];

  const allSpotIds = enrolledCourses.flatMap((c) =>
    c.units.flatMap((u) => u.path_spots.map((s) => s.id))
  );

  const { data: progressRecords } = await supabase
    .from("progress")
    .select("path_spot_id")
    .eq("user_id", user.id)
    .eq("completed", true)
    .in("path_spot_id", allSpotIds.length > 0 ? allSpotIds : ["none"]);

  const completedIds = new Set((progressRecords ?? []).map((p) => p.path_spot_id));

  const studentCourses = enrolledCourses.map((c) => {
    const spots = c.units.flatMap((u) => u.path_spots);
    const completedSpots = spots.filter((s) => completedIds.has(s.id)).length;
    return {
      id: c.id,
      title: c.title,
      description: c.description ?? "",
      color: c.color ?? "#58CC02",
      totalSpots: spots.length,
      completedSpots,
    };
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, streak")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <RealtimeSync userId={user.id} />
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black text-gray-800">
            {isAdmin ? "My Courses" : "Keep Learning! 🔥"}
          </h1>
          <div className="flex items-center gap-4">
            {!isAdmin && (
              <>
                <div className="flex items-center gap-1 text-[#FFC800] font-black">
                  <span className="text-xl">🔥</span>
                  <span>{profile?.streak ?? 0}</span>
                </div>
                <div className="flex items-center gap-1 text-[#58CC02] font-black">
                  <span className="text-xl">⭐</span>
                  <span>{profile?.xp ?? 0} XP</span>
                </div>
              </>
            )}
            {isAdmin && (
              <Link href="/admin/courses/new" className="duo-btn-green text-sm">
                + New Course
              </Link>
            )}
          </div>
        </div>

        {isAdmin && <AdminCourseList courses={adminShaped} />}

        {!isAdmin && (
          <>
            {studentCourses.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📖</div>
                <h2 className="text-2xl font-black text-gray-700 mb-2">No courses yet</h2>
                <p className="text-gray-500 mb-6">Browse available courses to get started</p>
                <Link href="/courses" className="duo-btn-green">Browse Courses</Link>
              </div>
            ) : (
              <>
                <StudentCourseList courses={studentCourses} />
                <div className="mt-6">
                  <Link href="/courses" className="text-[#1CB0F6] font-bold hover:underline">
                    Browse all courses →
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
