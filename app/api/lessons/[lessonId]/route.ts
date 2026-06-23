import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: { lessonId: string } }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("lessons").select("*").eq("id", params.lessonId).single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: { lessonId: string } }) {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { title, slides, fileUrl, fileExt } = await req.json();
  const supabase = createAdminClient();
  const update: Record<string, unknown> = { title, slides };
  if (fileUrl !== undefined) update.file_url = fileUrl;
  if (fileExt !== undefined) update.file_ext = fileExt;
  const { data, error } = await supabase
    .from("lessons").update(update).eq("id", params.lessonId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { lessonId: string } }) {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = createAdminClient();
  // Free up any PDF pages that were locked to this lesson
  await supabase
    .from("pdf_pages")
    .update({ is_used: false, lesson_id: null })
    .eq("lesson_id", params.lessonId);
  await supabase.from("lessons").delete().eq("id", params.lessonId);
  return NextResponse.json({ ok: true });
}
