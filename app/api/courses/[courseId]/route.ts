import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("courses")
    .select(`*, units(*, path_spots(*, lesson:lessons(*), quiz:quizzes(*, questions(*))))`)
    .eq("id", params.courseId)
    .single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: { courseId: string } }) {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("courses").update(body).eq("id", params.courseId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { courseId: string } }) {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = createAdminClient();
  await supabase.from("courses").delete().eq("id", params.courseId);
  return NextResponse.json({ ok: true });
}
