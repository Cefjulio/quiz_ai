import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLessonSummaryAndFlashcards } from "@/lib/ai";

export async function POST(req: Request, { params }: { params: { pdfId: string } }) {
  try {
    const user = await getUser();
    if (user?.user_metadata?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { pageIds, lessonTitle, unitId } = await req.json();
    if (!pageIds?.length || !lessonTitle || !unitId) {
      return NextResponse.json({ error: "pageIds, lessonTitle and unitId are required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch selected pages
    const { data: pages, error: pagesErr } = await supabase
      .from("pdf_pages")
      .select("id, page_number, text_content, pdf_upload_id, page_file_url")
      .in("id", pageIds)
      .order("page_number", { ascending: true });

    if (pagesErr || !pages?.length) {
      return NextResponse.json({ error: "Pages not found" }, { status: 404 });
    }

    // Fetch PDF info for title
    const { data: pdfUpload } = await supabase
      .from("pdf_uploads")
      .select("title, file_url")
      .eq("id", params.pdfId)
      .single();

    const pagesText = pages.map((p) => p.text_content);
    const pageNumbers = pages.map((p) => p.page_number);

    // AI: generate per-page summaries + flashcards
    const { pageSummaries, flashcards } = await generateLessonSummaryAndFlashcards(
      pagesText,
      pdfUpload?.title ?? "Document",
      pageNumbers
    );

    // Map page number → bullets for easy lookup
    const summaryMap: Record<number, string[]> = {};
    for (const ps of pageSummaries) {
      summaryMap[ps.pageNumber] = ps.bullets;
    }

    // One slide per selected page — no separate summary slide
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slides = pages.map((p: any) => ({
      type: "pdf_page",
      content: `Page ${p.page_number}\n\n${p.text_content}`,
      fileUrl: p.page_file_url ?? null,
      summary: summaryMap[p.page_number] ?? [],
    }));

    // Create lesson — no file_url so the viewer shows slides, not the original PDF
    const { data: lesson, error: lessonErr } = await supabase
      .from("lessons")
      .insert({ title: lessonTitle, slides })
      .select()
      .single();

    if (lessonErr || !lesson) {
      return NextResponse.json({ error: lessonErr?.message ?? "Failed to create lesson" }, { status: 500 });
    }

    // Create lesson path spot
    const { error: spotLessonErr } = await supabase
      .from("path_spots")
      .insert({ unit_id: unitId, type: "LESSON", lesson_id: lesson.id, order: 9999 });
    if (spotLessonErr) console.error("[create-lesson] spot error:", spotLessonErr);

    // Create quiz with FLASHCARD questions
    const { data: quiz, error: quizErr } = await supabase
      .from("quizzes")
      .insert({ title: `${lessonTitle} — Flashcards`, lesson_id: lesson.id })
      .select()
      .single();

    if (quizErr || !quiz) {
      return NextResponse.json({ error: quizErr?.message ?? "Failed to create quiz" }, { status: 500 });
    }

    // Insert flashcard questions
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

    // Create quiz path spot
    await supabase
      .from("path_spots")
      .insert({ unit_id: unitId, type: "QUIZ", quiz_id: quiz.id, order: 9999 });

    // Mark pages as used
    await supabase
      .from("pdf_pages")
      .update({ is_used: true, lesson_id: lesson.id })
      .in("id", pageIds);

    return NextResponse.json({
      lessonId: lesson.id,
      quizId: quiz.id,
      flashcardCount: flashcards.length,
      summaryBullets: pageSummaries.reduce((acc, ps) => acc + ps.bullets.length, 0),
    });
  } catch (err) {
    console.error("[create-lesson] unexpected:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
