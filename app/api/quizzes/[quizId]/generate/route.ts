import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateQuiz } from "@/lib/ai";

export async function POST(req: Request, { params }: { params: { quizId: string } }) {
  try {
    const user = await getUser();
    if (user?.user_metadata?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { lessonId, count } = await req.json();
    const supabase = createAdminClient();

    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      console.error("[generate] lesson fetch error:", lessonError);
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const slides: { content: string }[] = lesson.slides ?? [];
    const lessonText = slides.map((s) => s.content).join("\n\n");

    if (!lessonText.trim()) {
      return NextResponse.json({ error: "Lesson has no text content to generate from" }, { status: 400 });
    }

    const questions = await generateQuiz(lessonText, lesson.title, count || 8);

    const { error: deleteError } = await supabase
      .from("questions")
      .delete()
      .eq("quiz_id", params.quizId);

    if (deleteError) console.error("[generate] delete questions error:", deleteError);

    const { error: insertError } = await supabase.from("questions").insert(
      questions.map((q, i) => ({
        quiz_id: params.quizId,
        type: q.type,
        prompt: q.prompt,
        answers: q.answers,
        correct_answer: q.correctAnswer,
        order: i,
      }))
    );

    if (insertError) {
      console.error("[generate] insert questions error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("*, questions(*)")
      .eq("id", params.quizId)
      .order("order", { referencedTable: "questions", ascending: true })
      .single();

    if (quizError) {
      console.error("[generate] quiz fetch error:", quizError);
      return NextResponse.json({ error: quizError.message }, { status: 500 });
    }

    return NextResponse.json(quiz);
  } catch (err) {
    console.error("[generate] unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
