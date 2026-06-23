import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: { pdfId: string } }) {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pdf_uploads")
    .select("*, pdf_pages(id, page_number, text_content, is_used, lesson_id, page_file_url)")
    .eq("id", params.pdfId)
    .order("page_number", { referencedTable: "pdf_pages", ascending: true })
    .single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { pdfId: string } }) {
  const user = await getUser();
  if (user?.user_metadata?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = createAdminClient();
  await supabase.from("pdf_uploads").delete().eq("id", params.pdfId);
  return NextResponse.json({ ok: true });
}
