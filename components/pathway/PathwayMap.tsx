"use client";
import Link from "next/link";
import { motion } from "framer-motion";

interface FlashcardStats {
  learned: number;
  partially: number;
  notLearned: number;
  total: number;
}

interface PathSpot {
  id: string;
  order: number;
  type: string;
  lesson: { title: string } | null;
  quiz: { title: string } | null;
}

interface Unit {
  id: string;
  title: string;
  order: number;
  path_spots: PathSpot[];
}

function getSpotStatus(
  spot: PathSpot,
  allSpots: PathSpot[],
  completedIds: Set<string>
): "completed" | "available" | "locked" {
  if (completedIds.has(spot.id)) return "completed";
  // First spot of first unit is always available
  const spotIndex = allSpots.findIndex((s) => s.id === spot.id);
  if (spotIndex === 0) return "available";
  const prevSpot = allSpots[spotIndex - 1];
  if (completedIds.has(prevSpot.id)) return "available";
  return "locked";
}

export default function PathwayMap({
  units,
  completedIds: completedIdsArr,
  courseId,
  flashcardStats = {},
}: {
  units: Unit[];
  completedIds: string[];
  courseId: string;
  flashcardStats?: Record<string, FlashcardStats>;
}) {
  const completedIds = new Set(completedIdsArr);
  const allSpots = units.flatMap((u) => u.path_spots ?? []);

  return (
    <div className="space-y-8">
      {units.map((unit) => (
        <div key={unit.id}>
          {/* Unit header */}
          <div className="bg-[#58CC02] rounded-2xl p-4 mb-6 text-white">
            <p className="text-xs font-black uppercase tracking-widest opacity-80">
              Unit {unit.order}
            </p>
            <h2 className="text-xl font-black">{unit.title}</h2>
          </div>

          {/* Path spots */}
          <div className="flex flex-col items-center gap-6">
            {(unit.path_spots ?? []).map((spot, i) => {
              const status = getSpotStatus(spot, allSpots, completedIds);
              const isLesson = spot.type === "LESSON";
              const label = spot.lesson?.title || spot.quiz?.title || "Untitled";
              const offset = [0, 60, 90, 60, 0, -60, -90, -60][i % 8];
              const fcStats = flashcardStats[spot.id];

              return (
                <motion.div
                  key={spot.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ marginLeft: `${offset}px` }}
                  className="flex flex-col items-center"
                >
                  {status === "locked" ? (
                    <div className="spot-circle bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed w-20 h-20">
                      🔒
                    </div>
                  ) : (
                    <Link
                      href={`/learn/${courseId}/unit/${unit.id}/spot/${spot.id}`}
                      className="block"
                    >
                      <div
                        className={`spot-circle w-20 h-20 ${
                          status === "completed"
                            ? isLesson
                              ? "bg-[#1CB0F6] border-[#0092D9] text-white"
                              : "bg-[#58CC02] border-[#46A302] text-white"
                            : isLesson
                            ? "bg-[#1CB0F6] border-[#0092D9] text-white hover:scale-110"
                            : "bg-[#CE82FF] border-[#A855F7] text-white hover:scale-110"
                        } transition-transform`}
                      >
                        {status === "completed"
                          ? "⭐"
                          : isLesson
                          ? "📖"
                          : "🧠"}
                      </div>
                    </Link>
                  )}
                  <p className="text-xs font-bold text-gray-600 mt-2 text-center max-w-[100px] leading-tight">
                    {label}
                  </p>
                  {status === "completed" && (
                    <span className="text-xs text-[#58CC02] font-black mt-0.5">Done!</span>
                  )}
                  {/* Flashcard stats pills */}
                  {fcStats && fcStats.total > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap justify-center max-w-[120px]">
                      {fcStats.learned > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                          ✅ {fcStats.learned}
                        </span>
                      )}
                      {fcStats.partially > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                          🤔 {fcStats.partially}
                        </span>
                      )}
                      {fcStats.notLearned > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                          ❌ {fcStats.notLearned}
                        </span>
                      )}
                      {(fcStats.total - fcStats.learned - fcStats.partially - fcStats.notLearned) > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          • {fcStats.total - fcStats.learned - fcStats.partially - fcStats.notLearned} new
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
