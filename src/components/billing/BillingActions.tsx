"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { getMessages, type Locale } from "@/lib/i18n";

// Starts a Stripe Checkout or Billing Portal session and follows the
// redirect URL the API returns.
export function BillingActionButton({
  endpoint,
  variant = "primary",
  locale = "en",
  children,
}: {
  endpoint: "/api/billing/checkout" | "/api/billing/portal";
  variant?: "primary" | "secondary";
  locale?: Locale;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = getMessages(locale).billing;

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setError(json.error ?? t.genericActionError);
        setLoading(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError(t.unreachable);
      setLoading(false);
    }
  }

  return (
    <div>
      <Button type="button" variant={variant} onClick={go} disabled={loading}>
        {loading ? t.redirecting : children}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
