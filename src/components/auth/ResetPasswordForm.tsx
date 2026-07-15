"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    updatePassword,
    null,
  );

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Choose a new password
      </h1>
      <form action={formAction} className="mt-6 space-y-4">
        <Input
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="••••••••"
        />
        {state?.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending && <Spinner />}
          Update password
        </Button>
      </form>
    </div>
  );
}
