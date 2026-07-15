"use client";

import posthog from "posthog-js";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

// Product analytics. Inert unless NEXT_PUBLIC_POSTHOG_KEY is set.
// Tracks pathname-level pageviews only — no query strings, no PII fields.
export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
      autocapture: false,
      persistence: "localStorage+cookie",
    });
  }, []);

  useEffect(() => {
    if (!key || !pathname) return;
    posthog.capture("$pageview", { $current_url: pathname });
  }, [pathname]);

  return null;
}
