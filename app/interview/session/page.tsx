import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import InterviewSession from "@/components/interview/InterviewSession";

export const dynamic = "force-dynamic";

export default async function InterviewSessionPage({
  searchParams,
}: {
  searchParams: { courseId?: string; mode?: string };
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const courseId = searchParams.courseId;
  const mode = searchParams.mode === "exam" ? "exam" : "interview";

  if (!courseId) redirect("/interview");

  const supabase = createAdminClient();

  // Fetch course with content for context
  const { data: course } = await supabase
    .from("courses")
    .select(`
      id, title, description,
      units(
        title, order,
        path_spots(
          type,
          lesson:lessons(title, slides),
          quiz:quizzes(title, questions(type, prompt))
        )
      )
    `)
    .eq("id", courseId)
    .order("order", { referencedTable: "units", ascending: true })
    .single();

  if (!course) redirect("/interview");

  // Build compact course context (capped to avoid huge prompts)
  const contextLines: string[] = [
    `Course: ${course.title}`,
    course.description ? `Description: ${course.description}` : "",
    "",
    "Topics covered:",
  ];

  let charBudget = 3000;

  for (const unit of course.units ?? []) {
    if (charBudget <= 0) break;
    contextLines.push(`\nUnit: ${unit.title}`);
    charBudget -= unit.title.length + 10;

    for (const spot of unit.path_spots ?? []) {
      if (charBudget <= 0) break;

      if (spot.type === "LESSON" && spot.lesson) {
        const lesson = spot.lesson as { title: string; slides: { content?: string }[] };
        contextLines.push(`  Lesson: ${lesson.title}`);
        charBudget -= lesson.title.length + 12;

        // Add first slide text snippet
        const firstText = lesson.slides?.[0]?.content ?? "";
        if (firstText) {
          const snippet = firstText.slice(0, Math.min(200, charBudget));
          contextLines.push(`    Preview: ${snippet}`);
          charBudget -= snippet.length + 14;
        }
      }

      if (spot.type === "QUIZ" && spot.quiz) {
        const quiz = spot.quiz as {
          title: string;
          questions: { type: string; prompt: { text: string } }[];
        };
        const flashcards = (quiz.questions ?? [])
          .filter((q) => q.type === "FLASHCARD")
          .slice(0, 3);
        for (const fc of flashcards) {
          if (charBudget <= 0) break;
          const q = fc.prompt?.text ?? "";
          if (q) {
            contextLines.push(`    Key concept: ${q.slice(0, 100)}`);
            charBudget -= q.length + 18;
          }
        }
      }
    }
  }

  const courseContext = contextLines.filter(Boolean).join("\n");

  const modeInstructions =
    mode === "interview"
      ? `You are an experienced technical interviewer conducting a mock job interview. The candidate is learning the subject matter from this course. Your role:
- Start with a warm, professional greeting and your first interview question
- Ask one question at a time — behavioral and technical questions related to the course topics
- Listen to answers and ask relevant follow-up questions
- Be encouraging but realistic
- After ${8} exchanges total, wrap up naturally and give brief constructive feedback
- Keep each response under 4 sentences so it reads well aloud`
      : `You are a certification exam proctor. You are conducting an oral exam based on this course. Your role:
- Start with a brief greeting and immediately ask your first technical question
- Ask one clear question at a time — focus on key concepts, definitions, and applications from the course
- After each answer, briefly say if it was correct or not and why (1 sentence), then ask the next question
- After ${10} questions total, give a final score (X out of 10) and a one-paragraph summary
- Keep each response concise (2-3 sentences max) so it reads well aloud`;

  const systemPrompt = `${modeInstructions}

COURSE CONTENT FOR REFERENCE:
${courseContext}

IMPORTANT: Keep responses SHORT (2-4 sentences). You are speaking aloud, not writing text, so avoid bullet points, markdown, or lists.`;

  return (
    <InterviewSession
      systemPrompt={systemPrompt}
      mode={mode as "interview" | "exam"}
      courseName={course.title}
      courseId={courseId}
    />
  );
}
