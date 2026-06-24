"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
        <Link href="/dashboard" className="text-xl font-black text-[#58CC02]">
          🦉 LearnPath
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-4">
          {isAdmin && (
            <Link href="/admin/courses" className="text-sm font-bold text-gray-600 hover:text-[#58CC02] transition">
              Manage Courses
            </Link>
          )}
          <Link href="/dashboard" className="text-sm font-bold text-gray-600 hover:text-[#58CC02] transition">
            Learn
          </Link>
          <button onClick={handleSignOut} className="text-sm font-bold text-gray-400 hover:text-red-400 transition">
            Log out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
        >
          <span className={`block w-6 h-0.5 bg-gray-600 transition-all duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-6 h-0.5 bg-gray-600 transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block w-6 h-0.5 bg-gray-600 transition-all duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-100 px-4 py-3 flex flex-col gap-3">
          {isAdmin && (
            <Link
              href="/admin/courses"
              className="text-sm font-bold text-gray-700 py-2 border-b border-gray-100"
              onClick={() => setMenuOpen(false)}
            >
              Manage Courses
            </Link>
          )}
          <Link
            href="/dashboard"
            className="text-sm font-bold text-gray-700 py-2 border-b border-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            Learn
          </Link>
          <button
            onClick={() => { setMenuOpen(false); handleSignOut(); }}
            className="text-sm font-bold text-red-400 text-left py-2"
          >
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
