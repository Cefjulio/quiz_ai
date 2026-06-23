import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pathSpotId } = await req.json();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("progress")
    .upsert(
      { user_id: user.id, path_spot_id: pathSpotId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: "user_id,path_spot_id" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
