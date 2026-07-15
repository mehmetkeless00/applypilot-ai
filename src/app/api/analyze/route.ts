import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AnalyzeRequest } from "@/lib/ai/schema";
import { analysisErrorResponse, executeAnalysis } from "@/lib/analysis/execute";

// Generous headroom for slow model responses; Flash typically answers in seconds.
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = AnalyzeRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  try {
    const { id } = await executeAnalysis(supabase, user, parsed.data);
    return NextResponse.json({ id });
  } catch (err) {
    return analysisErrorResponse(err);
  }
}
