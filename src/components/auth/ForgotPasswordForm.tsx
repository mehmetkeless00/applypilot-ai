"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ResetState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { getMessages, type Locale } from "@/lib/i18n";

export function ForgotPasswordForm({ locale = "en" }: { locale?: Locale }) {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    requestPasswordReset,
    null,
  );
  const t = getMessages(locale).auth;

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {t.forgotTitle}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {t.forgotSubtitle}
      </p>

      {state?.sent ? (
        <div className="mt-6 rounded-lg bg-green-50 p-3 text-sm text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400">
          {t.forgotSent}
        </div>
      ) : (
        <form action={formAction} className="mt-6 space-y-4">
          <Input
            label={t.email}
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
          {state?.error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending && <Spinner />}
            {t.forgotSubmit}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
          {t.backToSignIn}
        </Link>
      </p>
    </div>
  );
}
