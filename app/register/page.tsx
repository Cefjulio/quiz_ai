"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Account created! Please log in.");
      router.push("/login");
    } else {
      const data = await res.json();
      toast.error(data.error || "Registration failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f7] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🦉</div>
          <h1 className="text-4xl font-black text-[#58CC02]">LearnPath</h1>
          <p className="text-gray-500 mt-1 font-semibold">Create your account</p>
        </div>
        <div className="duo-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1 uppercase tracking-wide">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-semibold focus:border-[#58CC02] focus:outline-none transition"
                placeholder="Your name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-semibold focus:border-[#58CC02] focus:outline-none transition"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-semibold focus:border-[#58CC02] focus:outline-none transition"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1 uppercase tracking-wide">I am a…</label>
              <div className="grid grid-cols-2 gap-3">
                {["STUDENT", "ADMIN"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-3 rounded-xl border-2 font-bold transition ${
                      role === r
                        ? "border-[#58CC02] bg-[#58CC02] text-white"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {r === "STUDENT" ? "🎓 Student" : "👩‍🏫 Teacher"}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="duo-btn-green w-full text-lg mt-2 disabled:opacity-60"
            >
              {loading ? "Creating…" : "CREATE ACCOUNT"}
            </button>
          </form>
        </div>
        <p className="text-center mt-6 text-gray-500 font-semibold">
          Already have an account?{" "}
          <Link href="/login" className="text-[#1CB0F6] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
