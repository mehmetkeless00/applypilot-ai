import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exportFilename,
  isExportDoc,
  isExportFormat,
} from "@/lib/export/content";
import { analysisDocxBuffer } from "@/lib/export/docx";
import { analysisPdfBuffer } from "@/lib/export/pdf";
import type { Analysis } from "@/lib/types";

const contentTypes = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "pdf";
  const doc = searchParams.get("doc") ?? "full";
  if (!isExportFormat(format) || !isExportDoc(doc)) {
    return NextResponse.json(
      { error: "Invalid format or doc parameter" },
      { status: 400 },
    );
  }
  if (format === "docx" && doc === "full") {
    return NextResponse.json(
      { error: "The full report is only available as PDF" },
      { status: 400 },
    );
  }

  // RLS already scopes the query to the caller's rows.
  const { id } = await params;
  const { data } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }
  const analysis = data as Analysis;

  try {
    const buffer =
      format === "docx"
        ? await analysisDocxBuffer(analysis, doc as "summary" | "cover_letter")
        : await analysisPdfBuffer(analysis, doc);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentTypes[format],
        "Content-Disposition": `attachment; filename="${exportFilename(analysis, doc, format)}"`,
      },
    });
  } catch (err) {
    console.error("Export generation failed:", err);
    return NextResponse.json(
      { error: "Could not generate the export. Try again." },
      { status: 500 },
    );
  }
}
