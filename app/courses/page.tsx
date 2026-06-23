import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "@/components/ui/Navbar";
import EnrollButton from "@/components/ui/EnrollButton";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*, units(count)")
    .eq("published", true)
    .order("created_at", { ascending: false });

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", user.id);
  const enrolledIds = new Set((enrollments ?? []).map((e) => e.course_id));

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-gray-800 mb-6">All Courses</h1>
        {!courses || courses.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">🎒</div>
            <p className="font-bold text-lg">No published courses yet</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => {
              const unitCount = Array.isArray(course.units) ? course.units[0]?.count ?? 0 : 0;
              return (
                <div key={course.id} className="duo-card p-5 flex flex-col">
                  <div
                    className="w-12 h-12 rounded-2xl mb-3 flex items-center justify-center text-2xl"
                    style={{ backgroundColor: course.color + "22" }}
                  >
                    📚
                  </div>
                  <h3 className="font-black text-lg text-gray-800">{course.title}</h3>
                  <p className="text-gray-500 text-sm mt-1 mb-3 flex-1 line-clamp-3">
                    {course.description || "No description"}
                  </p>
                  <p className="text-xs font-bold text-gray-400 mb-3">
                    {unitCount} unit{unitCount !== 1 ? "s" : ""}
                  </p>
                  <EnrollButton courseId={course.id} enrolled={enrolledIds.has(course.id)} />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
