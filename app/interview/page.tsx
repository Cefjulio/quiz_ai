import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "@/components/ui/Navbar";
import Link from "next/link";
import InterviewSetup from "@/components/interview/InterviewSetup";

export const dynamic = "force-dynamic";

export default async function InterviewPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  // Get all published courses (or all if admin)
  const isAdmin = user.user_metadata?.role === "ADMIN";

  let query = supabase
    .from("courses")
    .select("id, title, color")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    // Students only see courses they're enrolled in
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("user_id", user.id);
    const ids = (enrollments ?? []).map((e) => e.course_id);
    if (ids.length === 0) {
      return (
        <div className="min-h-screen bg-[#f7f7f7]">
          <Navbar />
          <main className="max-w-2xl mx-auto px-4 py-16 text-center">
            <div className="text-5xl mb-4">🎤</div>
            <h1 className="text-2xl font-black text-gray-800 mb-3">Interview Practice</h1>
            <p className="text-gray-500 mb-6">Enroll in a course first to start practicing.</p>
            <Link href="/courses" className="duo-btn-green">Browse Courses</Link>
          </main>
        </div>
      );
    }
    query = query.in("id", ids) as typeof query;
  }

  const { data: courses } = await query;

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 font-bold text-xl">←</Link>
          <h1 className="text-3xl font-black text-gray-800">🎤 Interview Practice</h1>
        </div>
        <p className="text-gray-500 text-sm mb-8 ml-10">
          Practice speaking about what you've learned. AI adapts its questions to your course content.
        </p>

        {!courses?.length ? (
          <div className="duo-card p-8 text-center text-gray-500 space-y-3">
            <div className="text-4xl">📚</div>
            <p className="font-bold">No courses available yet.</p>
            <Link href="/admin/courses/new" className="duo-btn-green inline-block">Create a Course</Link>
          </div>
        ) : (
          <InterviewSetup courses={courses} />
        )}
      </main>
    </div>
  );
}
