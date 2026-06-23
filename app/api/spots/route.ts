import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { unitId, type, lessonId, quizId } = await req.json();
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("path_spots")
    .select("*", { count: "exact", head: true })
    .eq("unit_id", unitId);
  const { data, error } = await supabase
    .from("path_spots")
    .insert({ unit_id: unitId, type, lesson_id: lessonId || null, quiz_id: quizId || null, order: (count ?? 0) + 1 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
