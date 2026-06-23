// No longer needed — Supabase handles auth without a client provider.
// Kept as a passthrough to avoid breaking any imports.
export default function SessionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
