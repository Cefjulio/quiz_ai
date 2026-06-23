import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quizId, questionAttempts, passed, score, totalQuestions, pathSpotId } = await req.json();
  const supabase = createAdminClient();

  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .insert({ user_id: user.id, quiz_id: quizId, score, total_questions: totalQuestions, passed, completed_at: new Date().toISOString() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("question_attempts").insert(
    questionAttempts.map((qa: { questionId: string; userAnswer: unknown; correct: boolean; firstTry: boolean }) => ({
      attempt_id: attempt.id,
      question_id: qa.questionId,
      user_answer: qa.userAnswer,
      correct: qa.correct,
      first_try: qa.firstTry,
    }))
  );

  if (passed && pathSpotId) {
    await supabase
      .from("progress")
      .upsert(
        { user_id: user.id, path_spot_id: pathSpotId, completed: true, score, completed_at: new Date().toISOString() },
        { onConflict: "user_id,path_spot_id" }
      );
    const { data: profile } = await supabase.from("profiles").select("xp").eq("id", user.id).single();
    await supabase.from("profiles").update({ xp: (profile?.xp ?? 0) + 10 }).eq("id", user.id);
  }

  return NextResponse.json(attempt);
}

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const quizId = searchParams.get("quizId");
  const supabase = createAdminClient();

  let query = supabase
    .from("quiz_attempts")
    .select(`*, question_attempts(*, question:questions(*))`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (quizId) query = query.eq("quiz_id", quizId);

  const { data: attempts } = await query;

  return NextResponse.json(
    (attempts ?? []).map((a) => ({
      ...a,
      question_attempts: (a.question_attempts ?? []).filter(
        (qa: { first_try: boolean; correct: boolean }) => qa.first_try && !qa.correct
      ),
    }))
  );
}
