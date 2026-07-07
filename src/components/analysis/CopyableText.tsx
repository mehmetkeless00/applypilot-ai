"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface CopyableTextProps {
  text: string;
  filename: string;
}

export function CopyableText({ text, filename }: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-4 flex gap-2">
      <Button variant="secondary" type="button" onClick={copy}>
        {copied ? "Copied!" : "Copy"}
      </Button>
      <Button variant="secondary" type="button" onClick={download}>
        Download
      </Button>
    </div>
  );
}
