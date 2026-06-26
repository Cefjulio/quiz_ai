import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCourseStructure, ParsedSection } from "@/lib/parsers/courseStructureParser";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (user?.user_metadata?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const courseId = formData.get("courseId") as string | null;

    if (!file || !courseId) {
      return NextResponse.json({ error: "file and courseId are required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const sections = parseCourseStructure(parsed.text as string);

    if (sections.length === 0) {
      return NextResponse.json(
        { error: "No sections found. Make sure the PDF uses === Section === and --- Video --- markers." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: units, error: unitsErr } = await supabase
      .from("units")
      .insert(sections.map((s) => ({ course_id: courseId, title: s.title, order: s.order })))
      .select();

    if (unitsErr || !units) {
      return NextResponse.json({ error: unitsErr?.message ?? "Failed to create units" }, { status: 500 });
    }

    const sectionsWithIds: (ParsedSection & { unitId: string })[] = sections.map((s, i) => ({
      ...s,
      unitId: units[i].id,
    }));

    const totalVideos = sections.reduce((sum, s) => sum + s.videos.length, 0);

    return NextResponse.json({ sections: sectionsWithIds, totalVideos });
  } catch (err) {
    console.error("[course-import/parse]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
