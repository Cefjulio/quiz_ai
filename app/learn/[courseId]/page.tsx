import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "@/components/ui/Navbar";
import PathwayMap from "@/components/pathway/PathwayMap";

export const dynamic = "force-dynamic";

export default async function LearnCoursePage({ params }: { params: { courseId: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const { data: course } = await supabase
    .from("courses")
    .select(`*, units(*, path_spots(*, lesson:lessons(*), quiz:quizzes(*)))`)
    .eq("id", params.courseId)
    .order("order", { referencedTable: "units", ascending: true })
    .single();

  if (!course) redirect("/dashboard");

  const allSpotIds = (course.units ?? []).flatMap((u) => (u.path_spots ?? []).map((s) => s.id));
  const { data: progressRecords } = await supabase
    .from("progress")
    .select("path_spot_id")
    .eq("user_id", user.id)
    .eq("completed", true)
    .in("path_spot_id", allSpotIds.length > 0 ? allSpotIds : ["none"]);
  const completedIds = new Set((progressRecords ?? []).map((p) => p.path_spot_id));

  // Flashcard stats per spot
  const allSpots = (course.units ?? []).flatMap((u) => u.path_spots ?? []);
  const quizSpots = allSpots.filter((s) => s.type === "QUIZ" && s.quiz_id);
  const quizIds = quizSpots.map((s) => s.quiz_id as string);

  const flashcardStatsMap: Record<string, { learned: number; partially: number; notLearned: number; total: number }> = {};

  if (quizIds.length > 0) {
    const { data: flashcardQs } = await supabase
      .from("questions")
      .select("id, quiz_id")
      .eq("type", "FLASHCARD")
      .in("quiz_id", quizIds);

    if (flashcardQs?.length) {
      const flashcardQIds = flashcardQs.map((q) => q.id);
      const { data: progressRows } = await supabase
        .from("flashcard_progress")
        .select("question_id, status")
        .eq("user_id", user.id)
        .in("question_id", flashcardQIds);

      const progressByQ: Record<string, string> = {};
      (progressRows ?? []).forEach((r) => { progressByQ[r.question_id] = r.status; });

      // Group by quiz_id
      const byQuiz: Record<string, { learned: number; partially: number; notLearned: number; total: number }> = {};
      for (const q of flashcardQs) {
        if (!byQuiz[q.quiz_id]) byQuiz[q.quiz_id] = { learned: 0, partially: 0, notLearned: 0, total: 0 };
        byQuiz[q.quiz_id].total++;
        const s = progressByQ[q.id];
        if (s === "LEARNED") byQuiz[q.quiz_id].learned++;
        else if (s === "PARTIALLY_LEARNED") byQuiz[q.quiz_id].partially++;
        else if (s === "NOT_LEARNED") byQuiz[q.quiz_id].notLearned++;
      }

      // Map spot_id -> stats
      for (const spot of quizSpots) {
        if (spot.quiz_id && byQuiz[spot.quiz_id]) {
          flashcardStatsMap[spot.id] = byQuiz[spot.quiz_id];
        }
      }
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, streak")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-800">{course.title}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-[#FFC800] font-black">
              <span className="text-xl">🔥</span>
              <span>{profile?.streak ?? 0}</span>
            </div>
            <div className="flex items-center gap-1 text-[#58CC02] font-black">
              <span className="text-xl">⭐</span>
              <span>{profile?.xp ?? 0} XP</span>
            </div>
          </div>
        </div>
        <PathwayMap
          units={JSON.parse(JSON.stringify(course.units ?? []))}
          completedIds={Array.from(completedIds) as string[]}
          courseId={course.id}
          flashcardStats={flashcardStatsMap}
        />
      </main>
    </div>
  );
}
