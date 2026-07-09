import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTranscriptLesson } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (user?.user_metadata?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { courseId, lessonId } = await req.json();
    if (!courseId && !lessonId) {
      return NextResponse.json({ error: "courseId or lessonId required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch lessons to regenerate
    let lessons: Array<{ id: string; title: string; slides: Array<{ content?: string }> }> = [];

    if (lessonId) {
      const { data } = await supabase
        .from("lessons")
        .select("id, title, slides")
        .eq("id", lessonId)
        .single();
      if (data) lessons = [data];
    } else {
      // Get all lessons in the course via path_spots
      const { data: spots } = await supabase
        .from("path_spots")
        .select("lesson:lessons(id, title, slides)")
        .eq("type", "LESSON")
        .in(
          "unit_id",
          (
            await supabase
              .from("units")
              .select("id")
              .eq("course_id", courseId)
          ).data?.map((u: { id: string }) => u.id) ?? []
        );

      lessons = (spots ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((s: any) => Array.isArray(s.lesson) ? s.lesson[0] : s.lesson)
        .filter(Boolean) as Array<{ id: string; title: string; slides: Array<{ content?: string }> }>;
    }

    const results: Array<{ lessonTitle: string; slideCount?: number; flashcardCount?: number; error?: string }> = [];

    for (const lesson of lessons) {
      try {
        // Reconstruct full transcript from all stored slide content
        const transcript = lesson.slides
          .map((s) => s.content ?? "")
          .join(" ")
          .trim();

        if (transcript.length < 80) {
          results.push({ lessonTitle: lesson.title, error: "Stored transcript too short to regenerate" });
          continue;
        }

        const { slides: generatedSlides, flashcards } = await generateTranscriptLesson(transcript, lesson.title);

        const dbSlides = generatedSlides.map((s) => ({
          type: "transcript",
          content: s.content,
          fileUrl: null,
          summary: s.bullets,
        }));

        // Update the lesson's slides
        await supabase
          .from("lessons")
          .update({ slides: dbSlides })
          .eq("id", lesson.id);

        // Update flashcards: find the quiz linked to this lesson, replace its questions
        const { data: quiz } = await supabase
          .from("quizzes")
          .select("id")
          .eq("lesson_id", lesson.id)
          .maybeSingle();

        if (quiz && flashcards.length > 0) {
          await supabase.from("questions").delete().eq("quiz_id", quiz.id);
          await supabase.from("questions").insert(
            flashcards.map((fc, i) => ({
              quiz_id: quiz.id,
              type: "FLASHCARD",
              prompt: { text: fc.front },
              answers: [{ id: "back", text: fc.back }],
              correct_answer: "back",
              order: i,
            }))
          );
        }

        results.push({
          lessonTitle: lesson.title,
          slideCount: generatedSlides.length,
          flashcardCount: flashcards.length,
        });
      } catch (err) {
        console.error("[regenerate-course] lesson error:", lesson.title, err);
        results.push({
          lessonTitle: lesson.title,
          error: err instanceof Error ? err.message : "Failed",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[regenerate-course]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
