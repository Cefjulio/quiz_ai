import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "@/components/ui/Navbar";
import Link from "next/link";
import PdfManager from "@/components/admin/PdfManager";

export const dynamic = "force-dynamic";

export default async function PdfManagerPage() {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") redirect("/dashboard");

  const supabase = createAdminClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, units(id, title)")
    .order("title", { ascending: true });

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/courses" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
          <h1 className="text-3xl font-black text-gray-800">PDF Manager</h1>
        </div>
        <PdfManager courses={courses ?? []} />
      </main>
    </div>
  );
}
