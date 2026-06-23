import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { parsePdf } from "@/lib/parsers/pdfParser";
import { parsePptx } from "@/lib/parsers/pptxParser";

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (user?.user_metadata?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    const fileUrl = `/uploads/${filename}`;

    let slides: { type: string; content: string }[] = [];

    if (ext === "pdf") {
      const pages = await parsePdf(buffer);
      slides = pages.map((content) => ({ type: "text", content }));
    } else if (ext === "pptx" || ext === "ppt") {
      const pages = await parsePptx(buffer);
      slides = pages.map((content) => ({ type: "text", content }));
    } else if (ext === "txt" || ext === "md") {
      const text = buffer.toString("utf-8");
      const chunks = text.split(/\n{2,}/).map((s) => s.trim()).filter((s) => s.length > 10);
      slides = (chunks.length > 0 ? chunks : [text]).map((content) => ({ type: "text", content }));
    }

    return NextResponse.json({ fileUrl, slides, ext });
  } catch (err) {
    console.error("[upload] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
