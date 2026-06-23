import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { courseId, title, description } = await req.json();
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("units")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);
  const { data, error } = await supabase
    .from("units")
    .insert({ course_id: courseId, title, description, order: (count ?? 0) + 1 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
