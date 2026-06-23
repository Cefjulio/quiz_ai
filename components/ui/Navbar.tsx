"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdmin(user?.user_metadata?.role === "ADMIN");
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="text-2xl font-black text-[#58CC02]">
          🦉 LearnPath
        </Link>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link
              href="/admin/courses"
              className="text-sm font-bold text-gray-600 hover:text-[#58CC02] transition"
            >
              Manage Courses
            </Link>
          )}
          <Link
            href="/dashboard"
            className="text-sm font-bold text-gray-600 hover:text-[#58CC02] transition"
          >
            Learn
          </Link>
          <button
            onClick={handleSignOut}
            className="text-sm font-bold text-gray-400 hover:text-red-400 transition"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
