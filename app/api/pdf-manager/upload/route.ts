import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePdfByPage } from "@/lib/parsers/pdfPageParser";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
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

    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Save original PDF
    const origFilename = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
    await writeFile(path.join(uploadDir, origFilename), buffer);
    const origFileUrl = `/uploads/${origFilename}`;

    // Extract text per page
    const pageTexts = await parsePdfByPage(buffer);

    // Split into individual single-page PDFs using pdf-lib
    const srcDoc = await PDFDocument.load(buffer);
    const pageFileUrls: string[] = [];

    for (let i = 0; i < srcDoc.getPageCount(); i++) {
      const singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
      singleDoc.addPage(copiedPage);
      const singleBytes = await singleDoc.save();
      const pageFilename = `${origFilename.replace(".pdf", "")}-p${i + 1}.pdf`;
      await writeFile(path.join(uploadDir, pageFilename), singleBytes);
      pageFileUrls.push(`/uploads/${pageFilename}`);
    }

    const supabase = createAdminClient();

    // Insert pdf_upload record
    const { data: upload, error: uploadErr } = await supabase
      .from("pdf_uploads")
      .insert({ title, file_url: origFileUrl, total_pages: pageTexts.length })
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
        page_file_url: pageFileUrls[i] ?? null,
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
