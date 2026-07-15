"use client";

import { useState } from "react";
import { deleteResume } from "@/app/dashboard/resumes/actions";
import { Button } from "@/components/ui/Button";

export function DeleteResumeButton({ resumeId }: { resumeId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="ghost" type="button" onClick={() => setConfirming(true)}>
        Delete resume
      </Button>
    );
  }

  return (
    <form action={deleteResume} className="flex items-center gap-2">
      <input type="hidden" name="resumeId" value={resumeId} />
      <span className="text-sm text-slate-500 dark:text-slate-400">
        Delete this resume and all versions? Past analyses are kept.
      </span>
      <Button variant="danger" type="submit">
        Delete
      </Button>
      <Button variant="ghost" type="button" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </form>
  );
}
