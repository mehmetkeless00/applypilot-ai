"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { type AuthState } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { getMessages, type Locale } from "@/lib/i18n";

interface AuthFormProps {
  mode: "login" | "signup";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  next?: string;
  message?: string;
  locale?: Locale;
}

export function AuthForm({ mode, action, next, message, locale = "en" }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthPending, setOauthPending] = useState(false);
  const isLogin = mode === "login";
  const t = getMessages(locale).auth;

  async function signInWithGoogle() {
    setOauthError(null);
    setOauthPending(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next && next.startsWith("/") ? next : "/dashboard",
    )}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setOauthError(t.googleUnavailable);
      setOauthPending(false);
    }
    // On success the browser navigates away to Google.
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {isLogin ? t.welcomeBack : t.createAccount}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {isLogin ? t.signInSubtitle : t.signUpSubtitle}
      </p>

      {message === "check-email" && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400">
          {t.checkEmail}
        </div>
      )}

      <div className="mt-6">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={signInWithGoogle}
          disabled={oauthPending || pending}
        >
          {oauthPending && <Spinner />}
          <svg aria-hidden viewBox="0 0 24 24" className="size-4">
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.2 3.5 2.7.24.03c2.2-2.1 3.5-5.1 3.5-8.6"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.1 0-5.8-2.1-6.7-5l-.2.02-3.6 2.8-.05.2C3.4 21.3 7.4 24 12 24"
            />
            <path
              fill="#FBBC05"
              d="M5.3 14.4c-.3-.8-.4-1.6-.4-2.4s.1-1.7.4-2.4l-.01-.2L1.6 6.5l-.12.06C.5 8.2 0 10 0 12s.5 3.8 1.5 5.4l3.8-3"
            />
            <path
              fill="#EB4335"
              d="M12 4.6c2.2 0 3.7 1 4.6 1.8l3.3-3.3C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.5 6.5l3.8 3c.9-2.9 3.6-5 6.7-5"
            />
          </svg>
          {t.continueWithGoogle}
        </Button>
        {oauthError && (
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {oauthError}
          </p>
        )}
        <div className="mt-5 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          {t.orWithEmail}
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      <form action={formAction} className="mt-5 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        {!isLogin && (
          <Input
            label={t.fullName}
            name="fullName"
            autoComplete="name"
            required
            placeholder="Ada Lovelace"
          />
        )}
        <Input
          label={t.email}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        <Input
          label={t.password}
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          minLength={8}
          placeholder="••••••••"
        />

        {isLogin && (
          <p className="text-right text-sm">
            <Link
              href="/forgot-password"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {t.forgotPassword}
            </Link>
          </p>
        )}

        {state?.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending && <Spinner />}
          {isLogin ? t.signIn : t.signUp}
        </Button>

        {!isLogin && (
          <p className="text-xs text-slate-400">
            {t.agreeStart}{" "}
            <Link href="/terms" className="underline hover:text-slate-600 dark:hover:text-slate-300">
              {t.terms}
            </Link>{" "}
            {t.and}{" "}
            <Link href="/privacy" className="underline hover:text-slate-600 dark:hover:text-slate-300">
              {t.privacyPolicy}
            </Link>
            .
          </p>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {isLogin ? (
          <>
            {t.noAccount}{" "}
            <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">
              {t.signUp}
            </Link>
          </>
        ) : (
          <>
            {t.haveAccount}{" "}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              {t.signIn}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
