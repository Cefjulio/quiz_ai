import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTranscriptLesson } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Pro: allow up to 60s for AI calls

interface VideoInput {
  title: string;
  transcript: string;
  unitId: string;
  lessonOrder: number;
  quizOrder: number;
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (user?.user_metadata?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { videos }: { videos: VideoInput[] } = await req.json();
    if (!videos?.length) {
      return NextResponse.json({ error: "videos array required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const results: Array<{
      videoTitle: string;
      lessonId?: string;
      quizId?: string;
      flashcardCount?: number;
      error?: string;
    }> = [];

    for (const video of videos) {
      try {
        const cleanTranscript = video.transcript.replace(/https?:\/\/\S+/g, "").trim();
        if (cleanTranscript.length < 80) {
          results.push({
            videoTitle: video.title,
            error: `Transcript too short (${cleanTranscript.length} chars after removing URLs) — not enough educational content to generate a lesson`,
          });
          continue;
        }
        const { bullets, flashcards } = await generateTranscriptLesson(cleanTranscript, video.title);

        const slide = {
          type: "transcript",
          content: cleanTranscript.slice(0, 3000),
          fileUrl: null,
          summary: bullets,
        };

        const { data: lesson, error: lessonErr } = await supabase
          .from("lessons")
          .insert({ title: video.title, slides: [slide] })
          .select()
          .single();

        if (lessonErr || !lesson) throw new Error(lessonErr?.message ?? "Failed to create lesson");

        await supabase.from("path_spots").insert({
          unit_id: video.unitId,
          type: "LESSON",
          lesson_id: lesson.id,
          order: video.lessonOrder,
        });

        const { data: quiz, error: quizErr } = await supabase
          .from("quizzes")
          .insert({ title: `${video.title} — Flashcards`, lesson_id: lesson.id })
          .select()
          .single();

        if (quizErr || !quiz) throw new Error(quizErr?.message ?? "Failed to create quiz");

        if (flashcards.length > 0) {
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

        await supabase.from("path_spots").insert({
          unit_id: video.unitId,
          type: "QUIZ",
          quiz_id: quiz.id,
          order: video.quizOrder,
        });

        results.push({
          videoTitle: video.title,
          lessonId: lesson.id,
          quizId: quiz.id,
          flashcardCount: flashcards.length,
        });
      } catch (err) {
        console.error("[process-batch] video error:", video.title, err);
        results.push({
          videoTitle: video.title,
          error: err instanceof Error ? err.message : "Failed",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[course-import/process-batch]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
