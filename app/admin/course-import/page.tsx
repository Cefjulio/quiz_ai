import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "@/components/ui/Navbar";
import CourseImporter from "@/components/admin/CourseImporter";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CourseImportPage() {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") redirect("/dashboard");

  const supabase = createAdminClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/courses" className="text-gray-400 hover:text-gray-600 font-bold text-xl">←</Link>
          <h1 className="text-3xl font-black text-gray-800">Batch Import</h1>
        </div>

        {!courses?.length ? (
          <div className="duo-card p-8 text-center text-gray-500 space-y-3">
            <div className="text-4xl">📚</div>
            <p className="font-bold">No courses found.</p>
            <p className="text-sm">Create a course first, then come back to import content into it.</p>
            <Link href="/admin/courses/new" className="duo-btn-green inline-block mt-2">
              Create a Course
            </Link>
          </div>
        ) : (
          <CourseImporter courses={courses} />
        )}
      </main>
    </div>
  );
}
