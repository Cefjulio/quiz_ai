import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePdfByPage } from "@/lib/parsers/pdfPageParser";
import { PDFDocument } from "pdf-lib";

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (user?.user_metadata?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = (formData.get("title") as string) || file?.name?.replace(/\.pdf$/i, "") || "Untitled";
    const courseId = (formData.get("courseId") as string) || null;

    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const supabase = createAdminClient();
    const baseFilename = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Upload original PDF to Supabase Storage
    const origFilename = `${baseFilename}.pdf`;
    const { error: origErr } = await supabase.storage
      .from("uploads")
      .upload(origFilename, buffer, { contentType: "application/pdf", upsert: false });

    if (origErr) {
      return NextResponse.json({ error: origErr.message }, { status: 500 });
    }

    const { data: { publicUrl: origFileUrl } } = supabase.storage.from("uploads").getPublicUrl(origFilename);

    // Extract text per page
    const pageTexts = await parsePdfByPage(buffer);

    // Split into individual single-page PDFs and upload each to Supabase Storage
    const srcDoc = await PDFDocument.load(buffer);
    const pageFileUrls: string[] = [];

    for (let i = 0; i < srcDoc.getPageCount(); i++) {
      const singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
      singleDoc.addPage(copiedPage);
      const singleBytes = await singleDoc.save();

      const pageFilename = `${baseFilename}-p${i + 1}.pdf`;
      const { error: pageErr } = await supabase.storage
        .from("pdf-pages")
        .upload(pageFilename, Buffer.from(singleBytes), { contentType: "application/pdf", upsert: false });

      if (pageErr) {
        console.error(`[pdf-upload] failed to upload page ${i + 1}:`, pageErr.message);
        pageFileUrls.push("");
      } else {
        const { data: { publicUrl } } = supabase.storage.from("pdf-pages").getPublicUrl(pageFilename);
        pageFileUrls.push(publicUrl);
      }
    }

    // Insert pdf_upload record
    const { data: upload, error: uploadErr } = await supabase
      .from("pdf_uploads")
      .insert({ title, file_url: origFileUrl, total_pages: pageTexts.length, course_id: courseId })
      .select()
      .single();

    if (uploadErr || !upload) {
      return NextResponse.json({ error: uploadErr?.message ?? "DB error" }, { status: 500 });
    }

    // Insert all pages with their individual file URLs
    const { error: pagesErr } = await supabase.from("pdf_pages").insert(
      pageTexts.map((p, i) => ({
        pdf_upload_id: upload.id,
        page_number: p.pageNumber,
        text_content: p.text,
        page_file_url: pageFileUrls[i] || null,
      }))
    );

    if (pagesErr) {
      return NextResponse.json({ error: pagesErr.message }, { status: 500 });
    }

    return NextResponse.json({ id: upload.id, title: upload.title, totalPages: pageTexts.length });
  } catch (err) {
    console.error("[pdf-upload] unexpected:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
