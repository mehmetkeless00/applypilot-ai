import { Document, HeadingLevel, Packer, Paragraph } from "docx";
import type { Analysis } from "@/lib/types";
import { docBody, docTitles, paragraphs } from "./content";

export async function analysisDocxBuffer(
  analysis: Analysis,
  doc: "summary" | "cover_letter",
): Promise<Buffer> {
  const context = [analysis.job_title, analysis.company]
    .filter(Boolean)
    .join(" · ");

  const children = [
    new Paragraph({ text: docTitles[doc], heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: context, spacing: { after: 240 } }),
    ...paragraphs(docBody(analysis, doc)).map(
      (p) => new Paragraph({ text: p, spacing: { after: 160 } }),
    ),
  ];

  const file = new Document({
    title: docTitles[doc],
    sections: [{ children }],
  });

  return Packer.toBuffer(file);
}
