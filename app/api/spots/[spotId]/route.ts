import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(req: Request, { params }: { params: { spotId: string } }) {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { lessonId, quizId } = await req.json().catch(() => ({}));
  const supabase = createAdminClient();

  await supabase.from("path_spots").delete().eq("id", params.spotId);

  // Cascade delete content
  if (lessonId) {
    // Free any PDF pages locked to this lesson before deleting it
    await supabase
      .from("pdf_pages")
      .update({ is_used: false, lesson_id: null })
      .eq("lesson_id", lessonId);
    await supabase.from("lessons").delete().eq("id", lessonId);
  }
  if (quizId) await supabase.from("quizzes").delete().eq("id", quizId);

  return NextResponse.json({ ok: true });
}
