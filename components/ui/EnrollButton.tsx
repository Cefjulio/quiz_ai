"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function EnrollButton({
  courseId,
  enrolled,
}: {
  courseId: string;
  enrolled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(enrolled);

  async function handleEnroll() {
    setLoading(true);
    const res = await fetch("/api/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      toast.success("Enrolled!");
      router.refresh();
    } else {
      toast.error("Could not enroll");
    }
  }

  if (done) {
    return (
      <a
        href={`/learn/${courseId}`}
        className="duo-btn-green w-full text-sm text-center"
      >
        Continue →
      </a>
    );
  }

  return (
    <button
      onClick={handleEnroll}
      disabled={loading}
      className="duo-btn-blue w-full text-sm disabled:opacity-60"
    >
      {loading ? "Enrolling…" : "Enroll Free"}
    </button>
  );
}
