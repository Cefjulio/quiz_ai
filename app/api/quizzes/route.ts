import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { title, lessonId, questions } = await req.json();
  const supabase = createAdminClient();

  const { data: quiz, error } = await supabase
    .from("quizzes")
    .insert({ title, lesson_id: lessonId || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (questions?.length > 0) {
    await supabase.from("questions").insert(
      questions.map(
        (q: { type: string; prompt: object; answers: object; correctAnswer: object }, i: number) => ({
          quiz_id: quiz.id,
          type: q.type,
          prompt: q.prompt,
          answers: q.answers,
          correct_answer: q.correctAnswer,
          order: i,
        })
      )
    );
  }

  const { data: full } = await supabase.from("quizzes").select("*, questions(*)").eq("id", quiz.id).single();
  return NextResponse.json(full);
}
