"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

interface AuthFormProps {
  mode: "login" | "signup";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  next?: string;
  message?: string;
}

export function AuthForm({ mode, action, next, message }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const isLogin = mode === "login";

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {isLogin ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {isLogin
          ? "Sign in to your ApplyPilot AI account"
          : "Start tailoring your job applications with AI"}
      </p>

      {message === "check-email" && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400">
          Check your email to confirm your account, then sign in.
        </div>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        {!isLogin && (
          <Input
            label="Full name"
            name="fullName"
            autoComplete="name"
            required
            placeholder="Ada Lovelace"
          />
        )}
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
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
          {isLogin ? "Sign in" : "Sign up"}
        </Button>

        {!isLogin && (
          <p className="text-xs text-slate-400">
            By signing up you agree to the{" "}
            <Link href="/terms" className="underline hover:text-slate-600 dark:hover:text-slate-300">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-slate-600 dark:hover:text-slate-300">
              Privacy Policy
            </Link>
            .
          </p>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {isLogin ? (
          <>
            No account?{" "}
            <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
