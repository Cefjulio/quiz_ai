import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { questionId, status } = await req.json();
    if (!questionId || !status) {
      return NextResponse.json({ error: "questionId and status required" }, { status: 400 });
    }

    const validStatuses = ["NOT_LEARNED", "PARTIALLY_LEARNED", "LEARNED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("flashcard_progress").upsert(
      { user_id: user.id, question_id: questionId, status, updated_at: new Date().toISOString() },
      { onConflict: "user_id,question_id" }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
