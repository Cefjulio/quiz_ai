import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "@/components/ui/Navbar";
import CoursesBrowser from "@/components/courses/CoursesBrowser";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("*, units(path_spots(id))")
    .eq("published", true)
    .order("created_at", { ascending: false });

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", user.id);
  const enrolledIds = new Set((enrollments ?? []).map((e) => e.course_id));

  // Fetch completion data for enrolled courses
  const enrolledCourseList = (courses ?? []).filter((c) => enrolledIds.has(c.id));
  const allSpotIds = enrolledCourseList.flatMap((c) =>
    (c.units ?? []).flatMap((u: { path_spots: { id: string }[] }) => u.path_spots.map((s) => s.id))
  );

  const { data: progressRecords } = await supabase
    .from("progress")
    .select("path_spot_id")
    .eq("user_id", user.id)
    .eq("completed", true)
    .in("path_spot_id", allSpotIds.length > 0 ? allSpotIds : ["none"]);

  const completedIds = new Set((progressRecords ?? []).map((p) => p.path_spot_id));

  const shaped = (courses ?? []).map((c) => {
    const unitCount = (c.units ?? []).length;
    const spots = (c.units ?? []).flatMap((u: { path_spots: { id: string }[] }) => u.path_spots ?? []);
    const completedSpots = spots.filter((s) => completedIds.has(s.id)).length;
    const pct = spots.length > 0 ? Math.round((completedSpots / spots.length) * 100) : 0;
    return {
      id: c.id,
      title: c.title,
      description: c.description ?? "",
      color: c.color ?? "#58CC02",
      unitCount,
      enrolled: enrolledIds.has(c.id),
      pct,
      isCompleted: enrolledIds.has(c.id) && spots.length > 0 && completedSpots >= spots.length,
    };
  });

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-gray-800 mb-6">All Courses</h1>
        {shaped.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">🎒</div>
            <p className="font-bold text-lg">No published courses yet</p>
          </div>
        ) : (
          <CoursesBrowser courses={shaped} />
        )}
      </main>
    </div>
  );
}
