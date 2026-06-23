"use client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function DeleteCourseButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  async function handleDelete() {
    if (!confirm("Delete this course? This cannot be undone.")) return;
    const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Course deleted");
      router.refresh();
    } else {
      toast.error("Could not delete course");
    }
  }
  return (
    <button onClick={handleDelete} className="duo-btn-red text-xs py-2 px-4">
      Delete
    </button>
  );
}
