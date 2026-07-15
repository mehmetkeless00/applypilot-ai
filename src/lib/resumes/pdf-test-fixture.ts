import React from "react";
import { Document, Page, Text, renderToBuffer } from "@react-pdf/renderer";

// Test-only helper: builds a real PDF (via the same library the app uses
// for exports) so extraction can be verified against genuine PDF bytes.
// Not imported by application code.
export async function samplePdf(text: string): Promise<Buffer> {
  return Buffer.from(
    await renderToBuffer(
      React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          { size: "A4" },
          React.createElement(Text, null, text),
        ),
      ),
    ),
  );
}
