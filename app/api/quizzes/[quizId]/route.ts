import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: { quizId: string } }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select("*, questions(*)")
    .eq("id", params.quizId)
    .order("order", { referencedTable: "questions", ascending: true })
    .single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
