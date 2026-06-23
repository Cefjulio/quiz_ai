import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "@/components/ui/Navbar";
import Link from "next/link";
import CourseEditor from "@/components/admin/CourseEditor";

export const dynamic = "force-dynamic";

export default async function AdminCourseDetailPage({ params }: { params: { courseId: string } }) {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") redirect("/dashboard");

  const supabase = createAdminClient();
  const { data: course } = await supabase
    .from("courses")
    .select(`*, units(*, path_spots(*, lesson:lessons(*), quiz:quizzes(*, questions(count))))`)
    .eq("id", params.courseId)
    .order("order", { referencedTable: "units", ascending: true })
    .single();

  if (!course) redirect("/admin/courses");

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/courses" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
          <h1 className="text-3xl font-black text-gray-800">{course.title}</h1>
          {course.published ? (
            <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded-full">Published</span>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-1 rounded-full">Draft</span>
          )}
        </div>
        <CourseEditor course={JSON.parse(JSON.stringify(course))} />
      </main>
    </div>
  );
}
