"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

// Starts a Stripe Checkout or Billing Portal session and follows the
// redirect URL the API returns.
export function BillingActionButton({
  endpoint,
  variant = "primary",
  children,
}: {
  endpoint: "/api/billing/checkout" | "/api/billing/portal";
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setError(json.error ?? "Something went wrong. Try again.");
        setLoading(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Could not reach the server. Try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button type="button" variant={variant} onClick={go} disabled={loading}>
        {loading ? "Redirecting…" : children}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
