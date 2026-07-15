"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            An unexpected error occurred. It has been reported.
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
