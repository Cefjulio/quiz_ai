import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { title, slides, fileUrl, fileExt } = await req.json();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lessons")
    .insert({ title, slides, file_url: fileUrl ?? null, file_ext: fileExt ?? null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
