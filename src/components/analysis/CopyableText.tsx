"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { getMessages, type Locale } from "@/lib/i18n";

interface CopyableTextProps {
  text: string;
  filename: string;
  locale?: Locale;
}

export function CopyableText({ text, filename, locale = "en" }: CopyableTextProps) {
  const [copied, setCopied] = useState(false);
  const t = getMessages(locale).analysis;

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
        {copied ? t.copied : t.copy}
      </Button>
      <Button variant="secondary" type="button" onClick={download}>
        {t.download}
      </Button>
    </div>
  );
}
