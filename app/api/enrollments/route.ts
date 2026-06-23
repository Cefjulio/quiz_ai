import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { courseId } = await req.json();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("enrollments")
    .insert({ user_id: user.id, course_id: courseId });
  if (error) return NextResponse.json({ error: "Already enrolled or course not found" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
