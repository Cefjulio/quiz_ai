import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SlideViewer from "@/components/lesson/SlideViewer";
import QuizRunner from "@/components/quiz/QuizRunner";
import FlashcardRunner from "@/components/quiz/FlashcardRunner";

export const dynamic = "force-dynamic";

export default async function SpotPage({
  params,
}: {
  params: { courseId: string; unitId: string; spotId: string };
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const { data: spot } = await supabase
    .from("path_spots")
    .select(`*, lesson:lessons(*), quiz:quizzes(*, questions(*))`)
    .eq("id", params.spotId)
    .order("order", { referencedTable: "quiz.questions" as never, ascending: true })
    .single();

  if (!spot) redirect(`/learn/${params.courseId}`);

  if (spot.type === "LESSON" && spot.lesson) {
    return (
      <SlideViewer
        lesson={{ ...spot.lesson, slides: spot.lesson.slides }}
        spotId={spot.id}
        courseId={params.courseId}
        unitId={params.unitId}
      />
    );
  }

  if (spot.type === "QUIZ" && spot.quiz) {
    const questions = (spot.quiz.questions ?? []).map((q) => ({
      ...q,
      correctAnswer: q.correct_answer,
    }));

    // If all questions are FLASHCARD type, use FlashcardRunner
    const isFlashcardDeck = questions.length > 0 && questions.every((q) => q.type === "FLASHCARD");
    if (isFlashcardDeck) {
      const { data: progressRows } = await supabase
        .from("flashcard_progress")
        .select("question_id, status")
        .eq("user_id", user.id)
        .in("question_id", questions.map((q) => q.id));

      const initialProgress: Record<string, "NOT_LEARNED" | "PARTIALLY_LEARNED" | "LEARNED"> = {};
      (progressRows ?? []).forEach((r) => {
        initialProgress[r.question_id] = r.status;
      });

      return (
        <FlashcardRunner
          quiz={{ ...spot.quiz, questions }}
          spotId={spot.id}
          courseId={params.courseId}
          initialProgress={initialProgress}
        />
      );
    }

    const { data: previousAttempts } = await supabase
      .from("quiz_attempts")
      .select(`*, question_attempts(*, question:questions(*))`)
      .eq("user_id", user.id)
      .eq("quiz_id", spot.quiz.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const errorReview = (previousAttempts?.[0]?.question_attempts ?? [])
      .filter((qa: { first_try: boolean; correct: boolean }) => qa.first_try && !qa.correct)
      .map((qa: { user_answer: unknown; question: Record<string, unknown> } & Record<string, unknown>) => ({
        ...qa,
        userAnswer: qa.user_answer,
        question: {
          ...qa.question,
          correctAnswer: qa.question.correct_answer,
        },
      }));

    return (
      <QuizRunner
        quiz={{ ...spot.quiz, questions }}
        spotId={spot.id}
        courseId={params.courseId}
        errorReview={errorReview}
      />
    );
  }

  redirect(`/learn/${params.courseId}`);
}
